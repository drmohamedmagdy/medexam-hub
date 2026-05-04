"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { sendEmail, verificationEmail, welcomeEmail } from "@/lib/email";

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
