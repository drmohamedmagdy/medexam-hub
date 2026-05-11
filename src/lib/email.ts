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
  | "broadcast"
  | "group_invite"
  | "community_digest"
  | "public_group_announcement"
  | "public_group_post"
  | "review_reminder"
  | "friend_request";

const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — short window for password reset
const FRIEND_ACTION_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

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

// Resend errors that are worth retrying. "Unable to fetch data" is
// what Resend returns when its upstream MTA momentarily can't be
// reached — it's transient and a retry usually succeeds. "Too many
// requests" is rate-limit; a short pause + retry clears it.
const RETRYABLE_ERROR_RE =
  /unable to fetch data|the request could not be resolved|too many requests|rate limit|connection.*reset|fetch failed|service unavailable|gateway/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const payload = {
    from,
    replyTo: REPLY_TO,
    to: [args.toEmail],
    subject: args.subject,
    html: args.html,
    text: htmlToText(args.html),
    headers: unsubscribeHeaders(args.toUserId, args.category),
  };

  // Up to 3 attempts with backoff. Critical emails (password reset,
  // verification) absolutely have to land; the few seconds of extra
  // latency is the right tradeoff against locking a user out.
  const MAX_ATTEMPTS = 3;
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await resend.emails.send(payload);
      if (!error) {
        await prisma.emailLog.create({
          data: {
            userId: args.toUserId,
            toEmail: args.toEmail,
            subject: args.subject,
            category: args.category,
          },
        });
        return { ok: true };
      }
      lastError = error.message ?? String(error);
      if (!RETRYABLE_ERROR_RE.test(lastError) || attempt === MAX_ATTEMPTS) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "send failed";
      if (!RETRYABLE_ERROR_RE.test(lastError) || attempt === MAX_ATTEMPTS) break;
    }
    // Exponential backoff: 800ms, 2000ms before attempts 2 and 3.
    await sleep(attempt === 1 ? 800 : 2000);
  }

  await prisma.emailLog.create({
    data: {
      userId: args.toUserId,
      toEmail: args.toEmail,
      subject: args.subject,
      category: args.category,
      error: lastError ?? "send failed",
    },
  });
  return { ok: false, error: lastError ?? "send failed" };
}

// ---------- Templates ----------

export function welcomeEmail(
  name: string | null,
  userId: string,
  email: string
): { subject: string; html: string } {
  const firstName = name ? escape(name.split(" ")[0]) : null;
  const greet = firstName ? `Welcome aboard, ${firstName}! 👋` : "Welcome aboard! 👋";
  const subject = firstName
    ? `Welcome to MedExam Hub, ${firstName} — verify your email`
    : "Welcome to MedExam Hub — verify your email";
  const url = appBaseUrl();
  const verifyUrl = `${url}/api/auth/verify-email?token=${makeVerifyToken(userId)}`;
  return {
    subject,
    html: wrapHtml(`
      <h1 style="font-size:24px;margin:0 0 16px;color:#111;">${greet}</h1>
      <p style="font-size:15px;">We're so glad you joined <strong>MedExam Hub</strong>. You're now part of a growing community of doctors, residents, paramedical students, and lifelong learners preparing for their next big exam — across MENA and beyond.</p>

      <div style="background:#fef9c3;border-left:3px solid #ca8a04;padding:14px 18px;margin:24px 0;border-radius:4px;">
        <p style="margin:0 0 10px;font-size:14px;color:#713f12;">
          <strong>One quick step first</strong> — confirm <strong>${escape(email)}</strong> is your email so we can send you exam reminders, receipts, and community updates.
        </p>
        <p style="margin:0;text-align:center;">
          <a href="${verifyUrl}" style="display:inline-block;background:#ca8a04;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Verify my email →</a>
        </p>
        <p style="margin:10px 0 0;font-size:11px;color:#713f12;">Link expires in 7 days. If the button doesn't work, paste this URL: <span style="word-break:break-all;">${verifyUrl}</span></p>
      </div>

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

export function reviewReminderEmail(
  name: string | null,
  userId: string,
  dueCount: number,
  topSpecialties: Array<{ specialty: string; count: number }>
): { subject: string; html: string } {
  const greet = name ? `Hi ${escape(name.split(" ")[0])},` : "Hi there,";
  const url = appBaseUrl();
  const cardWord = dueCount === 1 ? "card" : "cards";
  const specialtyList =
    topSpecialties.length > 0
      ? `<ul style="padding-left:18px;margin:8px 0 12px;color:#444;">${topSpecialties
          .slice(0, 4)
          .map(
            (s) =>
              `<li>${escape(s.specialty)} — <strong>${s.count}</strong></li>`
          )
          .join("")}</ul>`
      : "";
  return {
    subject: `${dueCount} ${cardWord} due for review`,
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p>You have <strong>${dueCount}</strong> ${cardWord} due for spaced-repetition review today — questions you got wrong on past exams.</p>
      ${specialtyList ? `<p style="margin-bottom:4px;color:#444;">Top areas to clear:</p>${specialtyList}` : ""}
      <p>
        <a href="${url}/review/session" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Start review →</a>
      </p>
      <p style="font-size:13px;color:#666;">Even five minutes a day keeps the missed concepts from slipping back out.</p>
      ${unsubFooter(userId, "reminders")}
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

/**
 * Send the same template to many users without tripping Resend's
 * per-second rate limit. Resend's current limit is 5 req/sec — sending
 * 8 in parallel (the old default) routinely overshot and produced 72
 * rate-limit failures in a single broadcast. New defaults stay
 * comfortably under: 4 in parallel, 1100ms between batches → ~3.6
 * req/sec sustained. sendEmail itself also retries 429s up to 3 times
 * with backoff, so even a transient overshoot recovers cleanly.
 *
 * Returns counts so callers / logs can reason about reach.
 */
export async function sendBatch(
  recipients: Array<{ id: string; email: string }>,
  build: (r: { id: string; email: string }) => Omit<SendArgs, "toUserId" | "toEmail">,
  opts: { batchSize?: number; delayMs?: number } = {}
): Promise<{ attempted: number; sent: number; failed: number }> {
  const batchSize = opts.batchSize ?? 4;
  const delayMs = opts.delayMs ?? 1100;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((r) =>
        sendEmail({
          toUserId: r.id,
          toEmail: r.email,
          ...build(r),
        })
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sent += 1;
      else failed += 1;
    }
    if (i + batchSize < recipients.length) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  return { attempted: recipients.length, sent, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Community
// ─────────────────────────────────────────────────────────────────────────────

export function groupInviteEmail(args: {
  inviterName: string;
  groupName: string;
  acceptUrl: string;
}): { subject: string; html: string } {
  const inviter = escape(args.inviterName);
  const group = escape(args.groupName);
  return {
    subject: `${inviter} invited you to join "${args.groupName}" on MedExam Hub`,
    html: wrapHtml(`
      <h1 style="margin:0 0 12px; font-size:22px;">You're invited to join <em>${group}</em> 👋</h1>
      <p>${inviter} has added you to the <strong>${group}</strong> group on MedExam Hub. You'll be able to see and post in the group's discussion feed.</p>
      <p style="margin-top:20px;">
        <a href="${args.acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Accept invite →</a>
      </p>
      <p style="font-size:13px;color:#666;">If you don't have an account yet, you'll be asked to sign up first — the invite still applies after you sign in.</p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${args.acceptUrl}</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">MedExam Hub · You're getting this because someone added your email to a group.</p>
    `),
  };
}

export function publicGroupAnnouncementEmail(args: {
  creatorName: string;
  groupName: string;
  description: string | null;
  groupUrl: string;
}): { subject: string; html: string } {
  const creator = escape(args.creatorName);
  const group = escape(args.groupName);
  const desc = args.description ? escape(args.description) : null;
  return {
    subject: `New public group on MedExam Hub: ${args.groupName}`,
    html: wrapHtml(`
      <h1 style="margin:0 0 12px; font-size:22px;">A new public group just opened 🌐</h1>
      <p><strong>${creator}</strong> just created a new public group called <strong>${group}</strong>. Anyone signed in can join — no invite needed.</p>
      ${
        desc
          ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #2563eb;background:#f8fafc;color:#374151;font-size:14px;line-height:1.5;">${desc}</blockquote>`
          : ""
      }
      <p style="margin-top:20px;">
        <a href="${args.groupUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View the group →</a>
      </p>
      <p style="font-size:13px;color:#666;">Don&apos;t want these announcements? You can switch off marketing emails any time from your account settings.</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">MedExam Hub · You're getting this because you opted in to community updates.</p>
    `),
  };
}

export function publicGroupPostEmail(args: {
  authorName: string;
  groupName: string;
  kind: "POST" | "QUESTION" | "ARTICLE";
  title: string | null;
  body: string;
  postUrl: string;
  groupUrl: string;
}): { subject: string; html: string } {
  const author = escape(args.authorName);
  const group = escape(args.groupName);
  const kindLabel =
    args.kind === "QUESTION" ? "question" : args.kind === "ARTICLE" ? "article" : "post";
  const kindBadge =
    args.kind === "QUESTION"
      ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">❓ Question</span>`
      : args.kind === "ARTICLE"
        ? `<span style="display:inline-block;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">📰 Article</span>`
        : `<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">💬 Post</span>`;
  const heading = args.title
    ? escape(args.title)
    : escape(args.body.slice(0, 100) + (args.body.length > 100 ? "…" : ""));
  const snippet = args.title
    ? escape(args.body.slice(0, 280) + (args.body.length > 280 ? "…" : ""))
    : null;

  const subject =
    args.kind === "QUESTION"
      ? `New question in ${args.groupName}: ${args.title ?? args.body.slice(0, 60)}`
      : `New in ${args.groupName}: ${args.title ?? args.body.slice(0, 60)}`;

  return {
    subject,
    html: wrapHtml(`
      <div style="margin-bottom:14px;">${kindBadge}</div>
      <h1 style="margin:0 0 8px; font-size:20px; line-height:1.35;">${heading}</h1>
      <p style="margin:0 0 14px; font-size:13px; color:#666;">
        by <strong>${author}</strong> in <a href="${args.groupUrl}" style="color:#2563eb;text-decoration:none;">🌐 ${group}</a>
      </p>
      ${
        snippet
          ? `<p style="margin:0 0 18px; font-size:14px; line-height:1.6; color:#333;">${snippet}</p>`
          : ""
      }
      <p style="margin:18px 0;">
        <a href="${args.postUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:600;">${
          args.kind === "QUESTION" ? "Answer this question →" : `Read & ${kindLabel === "post" ? "reply" : "comment"} →`
        }</a>
      </p>
      <p style="font-size:13px;color:#666;">Don&apos;t want updates from this group? Open the group page and choose Leave — or turn off marketing emails entirely from your account settings.</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">MedExam Hub · You&apos;re getting this because you opted in to community updates.</p>
    `),
  };
}

export function communityDigestEmail(args: {
  firstName: string | null;
  posts: Array<{
    id: string;
    title: string | null;
    body: string;
    kind: string;
    authorName: string;
  }>;
  baseUrl: string;
}): { subject: string; html: string } {
  const greet = args.firstName ? `Hey ${escape(args.firstName)},` : "Hey,";
  const items = args.posts
    .map((p) => {
      const url = `${args.baseUrl}/community/post/${p.id}`;
      const tag =
        p.kind === "QUESTION"
          ? "<span style=\"display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;\">Question</span>"
          : p.kind === "ARTICLE"
            ? "<span style=\"display:inline-block;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;\">Article</span>"
            : "<span style=\"display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;\">Post</span>";
      const heading = p.title ? escape(p.title) : escape(p.body.slice(0, 80) + (p.body.length > 80 ? "…" : ""));
      const snippet = p.title ? escape(p.body.slice(0, 200) + (p.body.length > 200 ? "…" : "")) : "";
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee;">
            <div style="margin-bottom:6px;">${tag}</div>
            <a href="${url}" style="color:#1e3a8a;text-decoration:none;font-weight:600;font-size:16px;">${heading}</a>
            ${snippet ? `<p style="margin:6px 0 0;font-size:13px;color:#444;line-height:1.5;">${snippet}</p>` : ""}
            <p style="margin:6px 0 0;font-size:12px;color:#888;">by ${escape(p.authorName)} · <a href="${url}" style="color:#2563eb;text-decoration:none;">read & reply →</a></p>
          </td>
        </tr>`;
    })
    .join("");

  const subject =
    args.posts.length === 1
      ? `New on MedExam Hub: ${escape(args.posts[0].title ?? args.posts[0].body.slice(0, 60))}`
      : `${args.posts.length} new community posts on MedExam Hub`;

  return {
    subject,
    html: wrapHtml(`
      <h1 style="margin:0 0 8px; font-size:22px;">${greet}</h1>
      <p>Here&apos;s what&apos;s happening in the MedExam Hub community since yesterday — give them a read and share what you know.</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;">${items}</table>
      <p style="margin-top:22px;">
        <a href="${args.baseUrl}/community" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Open the community →</a>
      </p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:11px; color:#888;">You can turn these emails off any time from your account settings.</p>
    `),
  };
}

// ---------- Friend-request action tokens ----------
//
// Token binds the recipient (rid) and sender (sid) of a friend request,
// plus an expiry. Possessing the token (i.e. having access to the
// recipient's inbox) authorises one-click Accept or Decline from the
// email body — no separate login round-trip required.

export function makeFriendActionToken(
  recipientId: string,
  senderId: string
): string {
  const body = Buffer.from(
    JSON.stringify({
      rid: recipientId,
      sid: senderId,
      exp: Date.now() + FRIEND_ACTION_TOKEN_TTL_MS,
    })
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret())
    .update("friend:" + body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyFriendActionToken(
  token: string
): { recipientId: string; senderId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret())
    .update("friend:" + body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.rid !== "string") return null;
    if (typeof parsed.sid !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { recipientId: parsed.rid, senderId: parsed.sid };
  } catch {
    return null;
  }
}

export function friendRequestEmail(args: {
  recipientName: string | null;
  recipientId: string;
  senderName: string;
  senderEmail: string;
  senderId: string;
  message: string | null;
}): { subject: string; html: string } {
  const greet = args.recipientName
    ? `Hi ${escape(args.recipientName.split(" ")[0])},`
    : "Hi there,";
  const url = appBaseUrl();
  const token = makeFriendActionToken(args.recipientId, args.senderId);
  const acceptUrl = `${url}/friends/respond?token=${encodeURIComponent(token)}&action=accept`;
  const declineUrl = `${url}/friends/respond?token=${encodeURIComponent(token)}&action=reject`;
  const profileUrl = `${url}/u/${args.senderId}`;
  const noteBlock = args.message
    ? `<blockquote style="margin:14px 0;padding:10px 14px;border-left:3px solid #cbd5e1;background:#f8fafc;color:#334155;font-size:14px;">${escape(args.message)}</blockquote>`
    : "";

  return {
    subject: `${args.senderName} sent you a friend request`,
    html: wrapHtml(`
      <h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
      <p><strong>${escape(args.senderName)}</strong> wants to connect with you on MedExam Hub.</p>
      ${noteBlock}
      <p style="margin-top:18px;">
        <a href="${acceptUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px;">✓ Accept</a>
        <a href="${declineUrl}" style="display:inline-block;border:1px solid #cbd5e1;color:#334155;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Decline</a>
      </p>
      <p style="font-size:13px;color:#666;margin-top:18px;">
        Or open <a href="${profileUrl}" style="color:#2563eb;">${escape(args.senderName)}'s profile</a> to decide later.
      </p>
      <p style="font-size:11px;color:#888;">Once you accept, you'll see each other's gallery, files, articles, and groups.</p>
      ${unsubFooter(args.recipientId, "reminders")}
    `),
  };
}
