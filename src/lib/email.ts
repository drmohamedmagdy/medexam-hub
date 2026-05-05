import "server-only";
import { Resend } from "resend";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export type EmailCategory =
  | "welcome"
  | "verification"
  | "password_reset"
  | "renewal_7d"
  | "renewal_1d"
  | "expired"
  | "reengagement"
  | "broadcast";

const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — short window for password reset

// Branded sender. Requires medexamhub.org to be verified in Resend's dashboard
// (SPF + DKIM TXT records added at Namecheap → Advanced DNS). Until then, set
// EMAIL_FROM=MedExam Hub <onboarding@resend.dev> in Vercel env to fall back.
const FROM_DEFAULT = "MedExam Hub <info@medexamhub.org>";

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

// Keep deliverability-improving headers consistent across all sends.
// Microsoft (Outlook/Hotmail) is especially sensitive to senders that
// don't expose a Reply-To or List-Unsubscribe — having both significantly
// improves inbox placement for new domains.
const REPLY_TO = "MedExam Hub Support <info@medexamhub.org>";

function unsubscribeHeaders(userId: string, category: EmailCategory): Record<string, string> {
  // Pick the right unsubscribe bucket based on category. Transactional
  // emails (verification, password_reset) skip List-Unsubscribe because
  // they're operationally critical — but everything else gets it.
  if (category === "verification" || category === "password_reset") return {};
  const kind: "marketing" | "reminders" =
    category === "renewal_7d" || category === "renewal_1d" || category === "expired"
      ? "reminders"
      : "marketing";
  const url = `${appBaseUrl()}/api/email/unsubscribe?token=${makeUnsubToken(userId, kind)}`;
  return {
    "List-Unsubscribe": `<${url}>, <mailto:info@medexamhub.org?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// Plain-text fallback — Outlook gives multipart emails better deliverability
// than HTML-only. Strip HTML tags and decode common entities.
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
      replyTo: REPLY_TO,
      to: [args.toEmail],
      subject: args.subject,
      html: args.html,
      text: htmlToText(args.html),
      headers: unsubscribeHeaders(args.toUserId, args.category),
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
  const firstName = name ? escape(name.split(" ")[0]) : null;
  const greet = firstName ? `Welcome aboard, ${firstName}! 👋` : "Welcome aboard! 👋";
  const subject = firstName ? `Welcome to MedExam Hub, ${firstName}` : "Welcome to MedExam Hub";
  const url = appBaseUrl();
  return {
    subject,
    html: wrapHtml(`
      <h1 style="font-size:24px;margin:0 0 16px;color:#111;">${greet}</h1>
      <p style="font-size:15px;">We're so glad you joined <strong>MedExam Hub</strong>. You're now part of a growing community of doctors, residents, paramedical students, and lifelong learners preparing for their next big exam — across MENA and beyond.</p>

      <div style="background:#eff6ff;border-left:3px solid #2563eb;padding:14px 18px;margin:24px 0;border-radius:4px;">
        <p style="margin:0;font-size:14px;color:#1e3a8a;">
          <strong>You're on the Free trial</strong> — 2 AI exams a month (up to 10 questions each), plus 1 file upload. No card required, no expiry.
        </p>
      </div>

      <p style="font-size:18px;font-weight:600;margin:28px 0 12px;">Ready to study?</p>

      <p style="text-align:center;margin:20px 0 28px;">
        <a href="${url}/exam/new" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(37,99,235,0.25);">Generate your first exam →</a>
      </p>

      <p style="font-size:15px;font-weight:600;margin-top:32px;color:#111;">A few things you can do here:</p>
      <ul style="font-size:14px;line-height:1.9;color:#444;padding-left:20px;">
        <li>📚 Pick from <strong>41 exam formats</strong> — USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric, FRCS, PLAB, and more</li>
        <li>🌍 Study in <strong>10 languages</strong> including Arabic, English, French, Urdu, and Persian</li>
        <li>🎯 Choose from <strong>50+ specialties</strong> — internal medicine, neurosurgery, pediatrics, anesthesia, pain management, and beyond</li>
        <li>📄 Upload your <strong>own lecture notes</strong> (PDF/DOCX) and we'll generate questions directly from them (Pro &amp; Premium)</li>
        <li>🩺 <strong>Paramedical or non-medical?</strong> Use the <em>Custom</em> tab to build exams in nursing, pharmacy tech, math, biology — anything</li>
        <li>🏆 Track your accuracy by topic so you know exactly where to focus next</li>
      </ul>

      <p style="font-size:14px;font-style:italic;color:#555;background:#fafafa;padding:14px 18px;margin:28px 0;border-radius:6px;border-left:3px solid #10b981;">
        💡 <strong>Tip:</strong> start with a topic you already know well — it's the fastest way to feel how the AI writes questions, and it'll calibrate your difficulty preference.
      </p>

      <p style="font-size:14px;">Stuck on which exam format to pick? Reply to this email or message us on WhatsApp at <a href="https://wa.me/201226218004" style="color:#2563eb;">+20 122 621 8004</a>. We're a small team and we read every single message.</p>

      <p style="font-size:16px;font-weight:600;margin-top:32px;color:#111;">Now go generate your first exam — you've got this. 💪</p>

      <p style="font-size:14px;color:#666;margin-top:8px;">— The MedExam Hub team</p>
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

// ---------- Email-verification tokens ----------

export function makeVerifyToken(userId: string): string {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + VERIFY_TOKEN_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update("verify:" + body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyVerifyToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update("verify:" + body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.uid !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

// ---------- Password-reset tokens ----------
//
// Tokens bind the userId, a fingerprint of the current passwordHash, and an
// expiry. When the password is changed (successfully or otherwise), the new
// passwordHash produces a different fingerprint so any outstanding reset
// token automatically becomes invalid. This also makes tokens single-use:
// the moment a reset succeeds, that token can't be replayed.

function passwordHashFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 12);
}

export function makeResetToken(userId: string, passwordHash: string): string {
  const body = Buffer.from(
    JSON.stringify({
      uid: userId,
      ph: passwordHashFingerprint(passwordHash),
      exp: Date.now() + RESET_TOKEN_TTL_MS,
    })
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update("reset:" + body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyResetToken(
  token: string,
  currentPasswordHash: string
): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update("reset:" + body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.uid !== "string") return null;
    if (typeof parsed.ph !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    if (parsed.ph !== passwordHashFingerprint(currentPasswordHash)) return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

// Light variant that only checks signature + expiry (used by the reset page
// to render the form before the user has typed their new password — we
// intentionally don't load the user's current passwordHash here to avoid an
// extra DB hit, the full check happens when the new password is submitted).
export function peekResetToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update("reset:" + body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.uid !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

export function passwordResetEmail(
  name: string | null,
  token: string
): { subject: string; html: string } {
  const firstName = name ? escape(name.split(" ")[0]) : null;
  const greet = firstName ? `Hi ${firstName},` : "Hi there,";
  const url = `${appBaseUrl()}/reset-password?token=${token}`;
  return {
    subject: "Reset your MedExam Hub password",
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>We received a request to reset the password on your <strong>MedExam Hub</strong> account. Click the button below to choose a new one:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Reset my password →</a>
      </p>
      <p style="font-size:13px;color:#666;">This link expires in 1 hour. If the button doesn't work, copy this URL into your browser:</p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${url}</p>
      <p style="font-size:13px;color:#666;margin-top:24px;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">MedExam Hub · For medical education only.</p>
    `),
  };
}

export function verificationEmail(
  name: string | null,
  userId: string,
  email: string
): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = `${appBaseUrl()}/api/auth/verify-email?token=${makeVerifyToken(userId)}`;
  return {
    subject: "Verify your MedExam Hub email",
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>Welcome to <strong>MedExam Hub</strong>. Please confirm that <strong>${escape(email)}</strong> is your email address by clicking below:</p>
      <p>
        <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Verify my email →</a>
      </p>
      <p style="font-size:13px;color:#666;">This link expires in 7 days. If the button doesn't work, copy this URL into your browser:</p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${url}</p>
      <p style="font-size:13px;color:#666;">If you didn't create an account on MedExam Hub, you can safely ignore this email.</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">MedExam Hub · For medical education only.</p>
    `),
  };
}
