"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
import {
  awardCredits,
  ensureReferralCode,
  findUserByReferralCode,
  SIGNUP_BONUS_CREDITS,
} from "@/lib/credits";
import { rateLimit } from "@/lib/rate-limit";

// Server actions don't get a Request object; pull the client IP from the
// forwarded headers Vercel sets. Best-effort — if proxies strip the header
// we fall back to a single shared bucket which still slows brute force.
async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}

const SignupSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
  referralCode: z.string().max(40).optional(),
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export type AuthState = { error?: string } | null;

/**
 * Returns the requested post-auth redirect target, but only if it's a safe
 * same-origin path. Anything weird (external host, protocol-relative,
 * missing leading slash) falls back to /dashboard so we can't be turned
 * into an open redirect.
 */
function safeNextRedirect(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "/dashboard";
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//")) return "/dashboard";
  // Reject URLs containing a host or protocol after the leading slash.
  if (/^\/[a-z]+:\/\//i.test(v)) return "/dashboard";
  return v.slice(0, 500);
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // 5 signups per IP per hour — prevents bot account creation.
  const ip = await clientIpFromHeaders();
  const rl = rateLimit({
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) {
    return { error: `Too many signup attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} min.` };
  }

  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralCode: String(formData.get("referralCode") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  let referrerId: string | null = null;
  if (parsed.data.referralCode) {
    const referrer = await findUserByReferralCode(parsed.data.referralCode);
    if (referrer) referrerId = referrer.id;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // Grant a 7-day Pro trial on signup. Auto-downgrades back to FREE in
  // the daily cron when trialEndsAt passes. trialUsed=true prevents a
  // second trial if the user deletes and recreates the account with
  // the same email later.
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      referredByUserId: referrerId,
      plan: "PRO",
      planStartedAt: now,
      planExpiresAt: trialEndsAt,
      trialEndsAt,
      trialUsed: true,
    },
  });

  // Generate a unique referral code so this new user can refer others
  // immediately. Don't block signup on this — retry on next account access if it fails.
  void ensureReferralCode(user.id).catch(() => {});

  // Welcome bonus — every new account starts with FREE plan, so 10 credits.
  void awardCredits({
    userId: user.id,
    amount: SIGNUP_BONUS_CREDITS.FREE,
    type: "signup_bonus",
    description: "Welcome bonus",
  }).catch(() => {});

  // Combined welcome + verify email — one message instead of two so the
  // user's inbox isn't immediately split-screen with us. Fire-and-forget
  // so a Resend hiccup doesn't block signup.
  const welcome = welcomeEmail(user.name, user.id, user.email);
  void sendEmail({
    toUserId: user.id,
    toEmail: user.email,
    subject: welcome.subject,
    category: "welcome",
    html: welcome.html,
  }).catch(() => {});

  await createSession(user.id);
  redirect(safeNextRedirect(formData.get("next")));
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
  // 10 login attempts per IP per 15 min — slows password-spraying without
  // locking out a forgetful real user.
  const ip = await clientIpFromHeaders();
  const rl = rateLimit({
    key: `login:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!rl.ok) {
    return { error: `Too many login attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} min.` };
  }

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
  redirect(safeNextRedirect(formData.get("next")));
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
  // 5 reset requests per IP per hour — prevents using the endpoint to
  // spam target inboxes / DoS our Resend quota.
  const ip = await clientIpFromHeaders();
  const rl = rateLimit({
    key: `reset:${ip}`,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  // Silently swallow the rate limit too — we already always return ok:true
  // to avoid email-enumeration; surfacing a rate-limit message would leak
  // that the attacker was hitting a real endpoint.
  if (!rl.ok) return { ok: true };

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
