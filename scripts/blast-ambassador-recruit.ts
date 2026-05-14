import { prisma } from "../src/lib/db";
import { Resend } from "resend";
import { createHmac } from "node:crypto";

// One-shot blast inviting opted-in users to apply as campus ambassadors.
// Self-contained — doesn't import from src/lib/email.ts (which is gated
// by `import "server-only"` and refuses to load in a tsx script). The
// email HTML mirrors what ambassadorRecruitEmail() in email.ts produces,
// so future-you can keep them in sync if you edit one.
//
// Filters:
//   - emailMarketing = true (respects the unsubscribe preference)
//   - emailVerifiedAt is not null (don't email unverified addresses)
//   - hasn't already submitted an application (joined against email)
//
// Default: throttled at 4 per ~1.1s to stay under Resend's free-tier
// 5/sec limit. A 1000-user list takes ~5 min.
//
// Dry run (print recipients, don't send):
//   npx tsx --env-file=.env scripts/blast-ambassador-recruit.ts --dry
//
// Send for real:
//   npx tsx --env-file=.env scripts/blast-ambassador-recruit.ts

const SITE_URL = "https://medexamhub.org";
const FROM = process.env.EMAIL_FROM || "MedExam Hub <info@medexamhub.org>";

function makeUnsubToken(userId: string): string {
  const secret = process.env.APP_SECRET ?? "dev-only-app-secret-replace-me-please";
  const body = Buffer.from(
    JSON.stringify({ uid: userId, c: "marketing" })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail(name: string | null, userId: string): { subject: string; html: string } {
  const firstName = name ? name.split(" ")[0] : null;
  const greet = firstName ? `Hi ${escape(firstName)},` : "Hi there,";
  const unsubUrl = `${SITE_URL}/api/email/unsubscribe?token=${makeUnsubToken(userId)}`;
  return {
    subject: "🎓 Become a MedExam Hub campus ambassador (free Pro for the year)",
    html: `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;line-height:1.55;">
<h1 style="font-size:22px;margin:0 0 16px;">${greet}</h1>
<p>We&rsquo;re recruiting <strong>one ambassador per Egyptian medical school</strong> &mdash; and we&rsquo;d love to hear from you.</p>

<p style="margin-top:18px;"><strong>What you get</strong></p>
<ul style="padding-left:20px;margin:8px 0;color:#374151;">
  <li>🎁 <strong>Free Pro plan</strong> for the full academic year (~8,400 EGP value)</li>
  <li>💰 <strong>Personal promo code</strong> giving your batch 20% off &mdash; and you earn referral credit on every signup</li>
  <li>⚡ <strong>Early access</strong> to new features (mock exam templates, specialty content)</li>
  <li>💼 <strong>LinkedIn recommendation</strong> at year-end</li>
  <li>🎓 <strong>Ambassador badge</strong> on your MedExam Hub profile</li>
</ul>

<p style="margin-top:18px;"><strong>What we ask</strong></p>
<ul style="padding-left:20px;margin:8px 0;color:#374151;">
  <li>Post a weekly question of the week in your batch&rsquo;s study groups (we provide the content)</li>
  <li>Run one 10-min intro at a study group meeting per semester</li>
  <li>Be available for 15 min/month of feedback calls about new features</li>
</ul>

<p style="margin-top:24px;">Application takes <strong>3 minutes</strong>. We review weekly and reply within 2 weeks.</p>

<p style="margin-top:16px;">
  <a href="${SITE_URL}/ambassador" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Apply to be an ambassador →</a>
</p>

<p style="font-size:13px;color:#6b7280;margin-top:18px;">
  We&rsquo;re especially looking for active students in Telegram / Facebook study groups, top scorers, and anyone already known for sharing good resources with their batch.
</p>

<hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
<p style="font-size:11px;color:#888;line-height:1.5;">
  You&rsquo;re receiving this because you&rsquo;re a MedExam Hub user opted into marketing emails.<br />
  <a href="${unsubUrl}" style="color:#888;">Unsubscribe from marketing emails</a>
</p>
</body></html>`,
  };
}

async function main() {
  const dry = process.argv.includes("--dry");

  const resendKey = process.env.RESEND_API_KEY;
  if (!dry && !resendKey) {
    console.error("RESEND_API_KEY not set — cannot send. Use --dry to preview.");
    process.exit(1);
  }
  const resend = resendKey ? new Resend(resendKey) : null;

  const existingApps = await prisma.ambassadorApplication.findMany({
    select: { email: true },
  });
  const appliedEmails = new Set(existingApps.map((a) => a.email.toLowerCase()));

  const users = await prisma.user.findMany({
    where: {
      emailMarketing: true,
      emailVerifiedAt: { not: null },
    },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const recipients = users.filter(
    (u) => !appliedEmails.has(u.email.toLowerCase())
  );

  console.log(`Total opted-in verified users: ${users.length}`);
  console.log(`Already applied (excluded):    ${users.length - recipients.length}`);
  console.log(`Will receive the email:         ${recipients.length}`);

  if (dry) {
    console.log("\nDry run — no emails sent. First 10 recipients:");
    for (const r of recipients.slice(0, 10)) {
      console.log(`  ${r.email}  ·  ${r.name ?? "(no name)"}`);
    }
    if (recipients.length > 10) {
      console.log(`  … and ${recipients.length - 10} more`);
    }
    return;
  }

  if (!resend) return; // already handled above; keeps TS happy

  console.log(
    `\nSending — this will take roughly ${Math.ceil(recipients.length / 3.5)} seconds…\n`
  );

  let sent = 0;
  let failed = 0;
  const batchSize = 4;
  const delayMs = 1100;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const tpl = buildEmail(r.name, r.id);
        const res = await resend.emails.send({
          from: FROM,
          to: r.email,
          subject: tpl.subject,
          html: tpl.html,
        });
        if (res.error) throw new Error(res.error.message);
        // Log in EmailLog so the email appears in /admin/email-logs alongside other categories.
        await prisma.emailLog.create({
          data: {
            userId: r.id,
            toEmail: r.email,
            category: "ambassador_recruit",
            subject: tpl.subject,
          },
        });
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent += 1;
      else {
        failed += 1;
        console.warn("  send failed:", r.reason);
      }
    }
    process.stdout.write(`  progress: ${Math.min(i + batchSize, recipients.length)}/${recipients.length} (sent ${sent}, failed ${failed})\r`);
    if (i + batchSize < recipients.length) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  console.log("\n\nDone.");
  console.log("  Attempted:", recipients.length);
  console.log("  Sent:     ", sent);
  console.log("  Failed:   ", failed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
