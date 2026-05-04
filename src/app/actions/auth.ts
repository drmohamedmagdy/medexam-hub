"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import {
  makeResetToken,
  passwordResetEmail,
  sendEmail,
  verificationEmail,
  verifyResetToken,
  welcomeEmail,
} from "@/lib/email";

const SignupSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export type AuthState = { error?: string } | null;

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    },
  });

  // Fire-and-forget welcome email — don't block signup if email fails.
  const welcome = welcomeEmail(user.name, user.id);
  void sendEmail({
    toUserId: user.id,
    toEmail: user.email,
    subject: welcome.subject,
    category: "welcome",
    html: welcome.html,
  }).catch(() => {});

  // Verification email (separate so the welcome and verify links each render
  // fully on their own — easier to read for the user).
  const verify = verificationEmail(user.name, user.id, user.email);
  void sendEmail({
    toUserId: user.id,
    toEmail: user.email,
    subject: verify.subject,
    category: "verification",
    html: verify.html,
  }).catch(() => {});

  await createSession(user.id);
  redirect("/dashboard");
}

export type ResendVerifyState = { ok?: boolean; error?: string } | null;

export async function resendVerificationAction(
  _prev: ResendVerifyState,
  _form: FormData
): Promise<ResendVerifyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (user.emailVerifiedAt) return { ok: true };

  // Cheap rate limit: don't allow more than one resend in 60 seconds. We
  // approximate this by checking the most recent EmailLog for this user.
  const recent = await prisma.emailLog.findFirst({
    where: { userId: user.id, category: "verification" },
    orderBy: { sentAt: "desc" },
  });
  if (recent && Date.now() - recent.sentAt.getTime() < 60_000) {
    return { error: "Please wait a moment before resending." };
  }

  const email = verificationEmail(user.name, user.id, user.email);
  const result = await sendEmail({
    toUserId: user.id,
    toEmail: user.email,
    subject: email.subject,
    category: "verification",
    html: email.html,
  });
  if (!result.ok) return { error: result.error ?? "Couldn't send. Try again later." };
  return { ok: true };
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Invalid email or password." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "Invalid email or password." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────────────────────────────────────

const RequestResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export type RequestResetState = { ok?: boolean; error?: string } | null;

export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const parsed = RequestResetSchema.safeParse({
    email: formData.get("email"),
  });
  // Always return ok=true on bad input or missing user — we don't reveal
  // whether an email exists in our database (prevents account enumeration).
  if (!parsed.success) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  if (user) {
    // Cheap rate limit: don't allow more than one reset email per minute per user.
    const recent = await prisma.emailLog.findFirst({
      where: { userId: user.id, category: "password_reset" },
      orderBy: { sentAt: "desc" },
    });
    if (!recent || Date.now() - recent.sentAt.getTime() > 60_000) {
      const token = makeResetToken(user.id, user.passwordHash);
      const email = passwordResetEmail(user.name, token);
      void sendEmail({
        toUserId: user.id,
        toEmail: user.email,
        subject: email.subject,
        category: "password_reset",
        html: email.html,
      }).catch(() => {});
    }
  }

  return { ok: true };
}

const ResetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8).max(200),
    passwordConfirm: z.string().min(8).max(200),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords don't match.",
    path: ["passwordConfirm"],
  });

export type ResetPasswordState = { error?: string } | null;

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Decode the userId from the token first so we can fetch the current
  // passwordHash (needed to bind the token to that exact password version).
  const parts = parsed.data.token.split(".");
  if (parts.length !== 2) return { error: "This reset link is invalid." };
  let payloadUid: string | null = null;
  try {
    const body = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (typeof body.uid === "string") payloadUid = body.uid;
  } catch {
    return { error: "This reset link is invalid." };
  }
  if (!payloadUid) return { error: "This reset link is invalid." };

  const user = await prisma.user.findUnique({
    where: { id: payloadUid },
    select: { id: true, passwordHash: true },
  });
  if (!user) return { error: "This reset link is invalid." };

  const verified = verifyResetToken(parsed.data.token, user.passwordHash);
  if (!verified) {
    return { error: "This reset link has expired or already been used. Request a new one." };
  }

  const newHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Sign the user in so they don't have to re-enter the password they just set.
  await createSession(user.id);
  redirect("/dashboard?reset=ok");
}
