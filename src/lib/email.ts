import "server-only";
import { Resend } from "resend";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export type EmailCategory =
  | "welcome"
  | "renewal_7d"
  | "renewal_1d"
  | "expired"
  | "reengagement"
  | "broadcast";

const FROM_DEFAULT = "MedExam Hub <onboarding@resend.dev>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://medexam-hub.vercel.app"
  );
}

function getSecret(): string {
  return process.env.APP_SECRET ?? "dev-only-app-secret-replace-me-please";
}

export function makeUnsubToken(userId: string, category: "marketing" | "reminders"): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, c: category })).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyUnsubToken(token: string): { userId: string; category: "marketing" | "reminders" } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.uid !== "string") return null;
    if (parsed.c !== "marketing" && parsed.c !== "reminders") return null;
    return { userId: parsed.uid, category: parsed.c };
  } catch {
    return null;
  }
}

function unsubFooter(userId: string, kind: "marketing" | "reminders"): string {
  const url = `${appBaseUrl()}/api/email/unsubscribe?token=${makeUnsubToken(userId, kind)}`;
  const label =
    kind === "marketing" ? "Unsubscribe from marketing emails" : "Stop renewal reminders";
  return `
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
    <p style="font-size:11px; color:#888; line-height:1.5;">
      You're receiving this because you have an account on MedExam Hub.
      <a href="${url}" style="color:#888;">${label}</a>.<br/>
      MedExam Hub · For medical education only.
    </p>
  `;
}

function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#111; line-height:1.55;">
${content}
</body></html>`.trim();
}

type SendArgs = {
  toUserId: string;
  toEmail: string;
  subject: string;
  category: EmailCategory;
  html: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || FROM_DEFAULT;

  if (!resend) {
    await prisma.emailLog.create({
      data: {
        userId: args.toUserId,
        toEmail: args.toEmail,
        subject: args.subject,
        category: args.category,
        error: "RESEND_API_KEY not set — email skipped",
      },
    });
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: [args.toEmail],
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      await prisma.emailLog.create({
        data: {
          userId: args.toUserId,
          toEmail: args.toEmail,
          subject: args.subject,
          category: args.category,
          error: error.message ?? String(error),
        },
      });
      return { ok: false, error: error.message ?? "Resend error" };
    }
    await prisma.emailLog.create({
      data: {
        userId: args.toUserId,
        toEmail: args.toEmail,
        subject: args.subject,
        category: args.category,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed";
    await prisma.emailLog.create({
      data: {
        userId: args.toUserId,
        toEmail: args.toEmail,
        subject: args.subject,
        category: args.category,
        error: msg,
      },
    });
    return { ok: false, error: msg };
  }
}

// ---------- Templates ----------

export function welcomeEmail(name: string | null, userId: string): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = appBaseUrl();
  return {
    subject: "Welcome to MedExam Hub",
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>Welcome to <strong>MedExam Hub</strong>. Your account is ready.</p>
      <p>You're on the Free trial — 10 questions per month. To get started, generate your first AI exam:</p>
      <p>
        <a href="${url}/exam/new" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Generate your first exam →</a>
      </p>
      <p>Pick from 41 exam formats (USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric, …) in 10 languages, at any difficulty.</p>
      <p>Need help choosing? Reply to this email or message us on WhatsApp at +20 122 621 8004.</p>
      ${unsubFooter(userId, "marketing")}
    `),
  };
}

export function renewalReminderEmail(
  name: string | null,
  userId: string,
  planLabel: string,
  daysLeft: number,
  expiryDate: Date
): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = appBaseUrl();
  const dayWord = daysLeft === 1 ? "day" : "days";
  return {
    subject:
      daysLeft <= 1
        ? `Your ${planLabel} plan expires tomorrow`
        : `Your ${planLabel} plan expires in ${daysLeft} ${dayWord}`,
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>Your <strong>${escape(planLabel)}</strong> plan ends on <strong>${expiryDate.toLocaleDateString()}</strong> — ${daysLeft} ${dayWord} from now.</p>
      <p>Renew now to keep your monthly question quota and your full exam history.</p>
      <p>
        <a href="${url}/account/subscription" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Renew now →</a>
      </p>
      <p>If you don't renew, your account drops to the Free tier on the expiry date. Your past exams stay safe and you can review them anytime here:</p>
      <p><a href="${url}/exams">View my exam history</a></p>
      ${unsubFooter(userId, "reminders")}
    `),
  };
}

export function expiredEmail(
  name: string | null,
  userId: string,
  planLabel: string
): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = appBaseUrl();
  return {
    subject: `Your ${planLabel} plan has expired`,
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>Your <strong>${escape(planLabel)}</strong> plan ended. You've been moved to the Free trial.</p>
      <p>Your full <strong>exam history is still saved</strong> — you can review every question and explanation here:</p>
      <p><a href="${url}/exams" style="color:#2563eb;">Review my exams</a></p>
      <p>To get your full quota back:</p>
      <p>
        <a href="${url}/plans" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Choose a plan →</a>
      </p>
      ${unsubFooter(userId, "reminders")}
    `),
  };
}

export function reengagementEmail(
  name: string | null,
  userId: string,
  pastExamCount: number
): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = appBaseUrl();
  return {
    subject: "Pick up where you left off",
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>You've completed <strong>${pastExamCount}</strong> exam${pastExamCount === 1 ? "" : "s"} on MedExam Hub. Don't lose momentum.</p>
      <p>Your past questions, answers, and explanations are all saved:</p>
      <p>
        <a href="${url}/exams" style="display:inline-block;border:1px solid #ccc;color:#111;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Review my exams</a>
        &nbsp;
        <a href="${url}/exam/new" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Generate a new one →</a>
      </p>
      <p style="font-size:13px;color:#666;">Tip: try a new specialty or exam format to stretch into areas you haven't covered.</p>
      ${unsubFooter(userId, "marketing")}
    `),
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
