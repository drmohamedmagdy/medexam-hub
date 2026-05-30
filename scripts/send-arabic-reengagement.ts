import { Resend } from "resend";
import { createHmac } from "node:crypto";
import { prisma } from "../src/lib/db";

// One-shot re-engagement: emails up to 50 FREE-plan users whose `name`
// contains Arabic letters, in friendly Egyptian dialect, with the
// TGAR20 promo code from the Arabic Telegram campaign.
//
// Cannot import sendEmail() from src/lib/email.ts because that module
// is gated with `server-only` (Next.js can't load it in a plain node
// script). We inline the bits that matter — Resend send, List-Unsubscribe
// header + token, EmailLog row — so the behavior matches /src/lib/email.ts
// where it counts (deliverability headers, audit trail, unsubscribe link).
//
// Safety:
//   - Default mode is dry-run. --send must be passed explicitly.
//   - Respects emailMarketing flag (skip opted-out users).
//   - Skips users we've re-engaged in the last 14 days.
//   - Batches in groups of 4 with 1.1s gap (Resend free tier = 5 req/sec).
//   - Updates User.lastReengagementAt on success.
//
// Usage:
//   npx tsx --env-file=.env scripts/send-arabic-reengagement.ts             # dry-run
//   npx tsx --env-file=.env scripts/send-arabic-reengagement.ts --send      # actually send
//   npx tsx --env-file=.env scripts/send-arabic-reengagement.ts --send --limit 10

const PROMO_CODE = "TGAR20";
const SITE = "https://medexamhub.org";
const FROM = process.env.EMAIL_FROM || "MedExam Hub <info@medexamhub.org>";
const REPLY_TO = "MedExam Hub Support <info@medexamhub.org>";

const ARABIC_RE = /[؀-ۿ]/;
const REENGAGE_COOLDOWN_DAYS = 14;

// Detect names that suggest the user reads Arabic. Most Egyptian users
// sign up with transliterated Latin names ("Mohamed", "Ahmed", "Rasha")
// so the strict Unicode-only filter misses ~99% of them. This token list
// is intentionally broad — false positives just get an Arabic email
// they may not read (low harm); false negatives miss our actual audience.
// Each token matches anywhere in the lowercased name (substring), so
// "kareem" catches "Kareem Mostafa" / "Mahmoud Kareem" / "akareem@".
const ARABIC_NAME_TOKENS: ReadonlyArray<string> = [
  // ─── Male given names + transliteration variants ───────────────────
  "mohamed", "mohammed", "mohammad", "muhammad", "mahmoud", "mahmood", "mahmud",
  "ahmed", "ahmad", "achmed",
  "ali", "aly",
  "omar", "umar",
  "khaled", "khalid",
  "hassan", "hasan", "hussam", "husam",
  "hussein", "hossein", "hussain", "husain",
  "ibrahim", "ebrahim", "ibraheem", "ebraheim",
  "yusuf", "youssef", "yousef", "yusef", "yosef", "yosof", "yousif",
  "saif", "sayf",
  "walid", "waleed", "wael",
  "fares", "faris",
  "abdallah", "abdulla", "abdullah",
  "abdelrahman", "abdulrahman", "abdurrahman", "abdelrhman",
  "abdelkader", "abdulqadir",
  "abdelaziz", "abdulaziz",
  "abdelsamie", "abdussamie", "abdelsalam",
  "abdelhady", "abdelfattah", "abdelhamid",
  "adel", "adil",
  "ayman", "aiman",
  "atef", "atif",
  "anwar", "anouar",
  "anas",
  "aziz", "azeez", "azim",
  "bahaa", "baha",
  "bassam", "bassem",
  "bilal", "belal",
  "emad", "imad",
  "ehab",
  "eyad", "iyad",
  "fadi",
  "faisal", "faysal",
  "farouk", "farouq", "faruq",
  "fathi", "fathy",
  "fouad", "fuad",
  "hany", "hani",
  "hatem", "hatim", "haitham",
  "hesham", "hisham",
  "hamdy", "hamdi", "hamdan",
  "karim", "kareem",
  "magdy", "magdi", "maged", "magid",
  "maher", "mahir",
  "mansour", "mansoor",
  "moataz", "mu'taz",
  "mostafa", "mustafa", "mustapha",
  "mounir", "munir",
  "nabil",
  "nader", "nadir",
  "nasser", "naser",
  "nizar", "nezar",
  "osama", "usama",
  "rabie", "raby",
  "ramy", "rami",
  "reda", "rida",
  "refaat", "rifaat", "rafat",
  "sami", "samy",
  "said", "sayed", "saied",
  "salah", "salem", "saleh",
  "shaaban", "shabaan",
  "sherif", "sharif",
  "tarek", "tareq", "tariq",
  "tamer", "tamir",
  "wagdi", "wagdy",
  "wahid", "waheed",
  "yahya", "yehia", "yahia",
  "yasser", "yaser", "yasir",
  "ziad", "zeyad", "ziyad", "zeyad",
  // ─── Female given names + transliteration variants ─────────────────
  "fatma", "fatima", "fatimah",
  "aisha", "ayesha", "aysha",
  "mariam", "maryam", "marym",
  "noor", "nour", "nora", "norah",
  "sara", "sarah",
  "salma", "salwa",
  "heba", "hiba",
  "hala",
  "rasha",
  "walaa",
  "rehab", "rihab",
  "hanan",
  "toqa", "toka",
  "marwa", "marwah",
  "hasnaa", "hasna",
  "souad", "soad", "suad",
  "naglaa", "nagla",
  "shrooq", "shoroq", "shuruq",
  "alaa",
  "amira", "ameera",
  "yasmin", "yasmine", "yasemin",
  "manar",
  "shaimaa",
  "amal",
  "amani",
  "asmaa", "asma",
  "menna", "minna",
  "meran", "mirna", "marina",
  "rana",
  "ola",
  "shahd",
  "doaa", "dua",
  "sahar",
  "soha",
  "lina",
  "layla", "laila", "leila",
  "dina", "deena",
  "dalia",
  "hoda", "houda",
  "mona",
  "maha",
  "mai", "may",
  "reem", "rim",
  "rania",
  "reham",
  "samar",
  "sondos", "sundus",
  "zeinab", "zainab", "zaynab",
  "habiba",
  "donia", "dunia",
  "jihan", "jehan",
  "eman", "iman",
  "engy", "engi",
  "doha",
  "aya",
  "lubna",
  "ghadeer", "ghada",
  "nada",
  "tasneem", "tasnim",
  "rehana",
  "vona",
  // ─── Egyptian/Arabic surname stems & particles ─────────────────────
  "elhenawy", "el-henawy", "elkorany", "elmoamly", "elbahat", "alkhalifah",
  "alzayyan", "abdelhady", "mady", "shabaan", "shaaban", "refaat",
  "emam", "ayyash",
];

// Prefixes that must appear at the START of a name token (i.e. preceded
// by start-of-string or whitespace). Spaced "el " without word-anchoring
// catches "Michael Bellemare" (the "el " inside "Michael ") as a false
// positive — so we require an actual word boundary.
const ARABIC_NAME_WORD_PREFIXES: ReadonlyArray<string> = [
  "el-", "al-", "abu", "abdel", "abdul", "abd ", "el ", "al ",
];

function looksArabic(name: string): boolean {
  if (ARABIC_RE.test(name)) return true; // literal Arabic letters
  const lower = name.toLowerCase();
  // Token match: a known Arabic name fragment anywhere in the string.
  for (const t of ARABIC_NAME_TOKENS) {
    if (lower.includes(t)) return true;
  }
  // Prefix match: each whitespace-separated word must START with the prefix.
  const words = lower.split(/\s+/);
  for (const w of words) {
    for (const p of ARABIC_NAME_WORD_PREFIXES) {
      if (w.startsWith(p)) return true;
    }
  }
  return false;
}

type Recipient = { id: string; email: string; name: string | null };

function pickFirstName(fullName: string | null): string {
  if (!fullName) return "صديقنا";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "صديقنا";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Same HMAC-SHA256 over base64url-encoded JSON as makeUnsubToken in
// src/lib/email.ts:60–64. Must match exactly so the link works.
function makeUnsubToken(userId: string, category: "marketing"): string {
  const secret = process.env.APP_SECRET ?? "dev-only-app-secret-replace-me-please";
  const body = Buffer.from(JSON.stringify({ uid: userId, c: category })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function buildEmail(userId: string, fullName: string | null): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = escapeHtml(pickFirstName(fullName));
  const ctaUrl = `${SITE}/plans?promo=${PROMO_CODE}`;
  const unsubUrl = `${SITE}/api/email/unsubscribe?token=${makeUnsubToken(userId, "marketing")}`;

  const subject = "مش ناوي تشترك معانا؟ 🩺";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; margin:0; padding:24px; color:#111; line-height:1.7; background:#fafafa;">
<div dir="rtl" style="text-align:right; max-width:560px; margin:0 auto; background:#ffffff; padding:32px 28px; border-radius:12px; border:1px solid #eee;">
  <p style="font-size:16px; margin:0 0 16px;">أهلاً ${firstName} 👋</p>

  <p style="font-size:16px; margin:0 0 16px;">
    <b>مش ناوي تشترك معانا وتستفيد بخدماتنا كاملة؟</b> 🤔
  </p>

  <p style="font-size:15px; margin:0 0 20px;">
    إحنا في <b>MedExam Hub</b> بنساعد آلاف الأطباء وطلاب الطب يتحضّروا
    لامتحاناتهم بأسلوب جديد كلياً — وحبّينا نفكّرك إنك ممكن تستفيد أكتر بكتير.
  </p>

  <ul style="font-size:15px; margin:0 0 20px; padding-right:8px; list-style:none;">
    <li style="margin:6px 0;">✅ آلاف الأسئلة المُولَّدة بالـ AI في كل التخصصات</li>
    <li style="margin:6px 0;">✅ امتحانات تجريبية موقّتة بمعايير الامتحانات الحقيقية</li>
    <li style="margin:6px 0;">✅ مراجعة الإجابات الخاطئة تلقائياً (spaced repetition)</li>
    <li style="margin:6px 0;">✅ شهادات إتمام موثّقة تضيفها لـ CV</li>
    <li style="margin:6px 0;">✅ تحضير لـ USMLE · MRCP · PLAB · امتحانات النيابة المصرية</li>
  </ul>

  <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; padding:16px 20px; margin:20px 0; text-align:right;">
    <p style="font-size:15px; margin:0 0 8px;">🎁 <b>عرض خاص ليك</b></p>
    <p style="font-size:14px; margin:0 0 14px; color:#333;">
      استخدم الكود <b style="font-family:Consolas, Menlo, monospace; background:#ffffff; padding:2px 8px; border-radius:4px; direction:ltr; display:inline-block;">${PROMO_CODE}</b> واحصل على خصم <b>20%</b> على أي خطة مدفوعة.<br/>
      العرض ساري حتى يوم <b>3 يونيو</b>.
    </p>
    <p style="margin:0;">
      <a href="${ctaUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; font-size:15px;">
        اشترك الآن واحصل على الخصم ←
      </a>
    </p>
  </div>

  <p style="font-size:14px; margin:20px 0 8px; color:#444;">
    لو عندك أي سؤال أو حابب تعرف الخطة الأنسب ليك، رد على الإيميل ده وهنرد عليك شخصياً.
  </p>

  <p style="font-size:14px; margin:16px 0 0; color:#666;">
    تحياتنا،<br/>
    <b>فريق MedExam Hub</b>
  </p>

  <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
  <p style="font-size:11px; color:#888; line-height:1.5; text-align:right;">
    وصلك الإيميل ده لأن عندك حساب على MedExam Hub.
    لو مش عايز إيميلات تسويقية، <a href="${unsubUrl}" style="color:#888;">اضغط هنا لإلغاء الاشتراك</a>.<br/>
    MedExam Hub · For medical education only.
  </p>
</div>
</body></html>`;

  const text = [
    `أهلاً ${pickFirstName(fullName)}،`,
    "",
    "مش ناوي تشترك معانا وتستفيد بخدماتنا كاملة؟",
    "",
    "في MedExam Hub بنساعدك تتحضّر لامتحاناتك:",
    "- آلاف الأسئلة بالـ AI في كل التخصصات",
    "- امتحانات تجريبية موقّتة",
    "- مراجعة ذكية للإجابات الخاطئة",
    "- شهادات إتمام موثّقة",
    "- تحضير لـ USMLE / MRCP / PLAB / النيابة",
    "",
    `🎁 عرض خاص: استخدم الكود ${PROMO_CODE} لخصم 20% على أي خطة مدفوعة.`,
    `العرض ساري حتى 3 يونيو فقط: ${ctaUrl}`,
    "",
    "لو عندك سؤال، رد على الإيميل وهنرد عليك شخصياً.",
    "",
    "تحياتنا،",
    "فريق MedExam Hub",
    "",
    `لإلغاء الاشتراك: ${unsubUrl}`,
  ].join("\n");

  return { subject, html, text };
}

async function fetchRecipients(limit: number): Promise<Recipient[]> {
  const cooldownCutoff = new Date(Date.now() - REENGAGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      plan: "FREE",
      emailMarketing: true,
      OR: [{ lastReengagementAt: null }, { lastReengagementAt: { lt: cooldownCutoff } }],
      name: { not: null },
    },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const arabic = candidates.filter((u) => u.name && looksArabic(u.name));
  return arabic.slice(0, limit).map(({ id, email, name }) => ({ id, email, name }));
}

async function sendOne(
  resend: Resend,
  u: Recipient
): Promise<{ ok: boolean; error?: string }> {
  const { subject, html, text } = buildEmail(u.id, u.name);
  const unsubUrl = `${SITE}/api/email/unsubscribe?token=${makeUnsubToken(u.id, "marketing")}`;

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: u.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>, <mailto:info@medexamhub.org?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (res.error) {
      await prisma.emailLog.create({
        data: {
          userId: u.id,
          toEmail: u.email,
          subject,
          category: "reengagement",
          error: res.error.message ?? String(res.error),
        },
      });
      return { ok: false, error: res.error.message ?? String(res.error) };
    }
    await prisma.emailLog.create({
      data: {
        userId: u.id,
        toEmail: u.email,
        subject,
        category: "reengagement",
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.emailLog.create({
      data: {
        userId: u.id,
        toEmail: u.email,
        subject,
        category: "reengagement",
        error: msg,
      },
    });
    return { ok: false, error: msg };
  }
}

async function main() {
  const send = process.argv.includes("--send");
  const limitIdx = process.argv.indexOf("--limit");
  const limit =
    limitIdx > -1 ? Math.max(1, Math.min(100, Number(process.argv[limitIdx + 1] ?? 50))) : 50;

  const toIdx = process.argv.indexOf("--to");
  const toEmail = toIdx > -1 ? process.argv[toIdx + 1] : null;

  // --to flag: send one test email to the given address, look up the
  // matching User row to keep unsub tokens + EmailLog working. Doesn't
  // touch the recipient filter, doesn't bump lastReengagementAt (so the
  // user stays eligible for the real blast).
  if (toEmail) {
    const u = await prisma.user.findUnique({
      where: { email: toEmail },
      select: { id: true, email: true, name: true },
    });
    if (!u) {
      console.error(`✗ No user found with email ${toEmail}`);
      process.exit(1);
    }
    console.log(`Sending ONE test email to ${u.email} (${u.name})…`);
    if (!send) {
      console.log("(dry run — pass --send to actually deliver)");
      return;
    }
    if (!process.env.RESEND_API_KEY) {
      console.error("✗ RESEND_API_KEY not set in .env");
      process.exit(1);
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await sendOne(resend, u);
    console.log(result.ok ? `✓ Sent.` : `✗ Failed: ${result.error}`);
    return;
  }

  const recipients = await fetchRecipients(limit);

  console.log(
    `Found ${recipients.length} FREE-plan users with Arabic names (cooldown: ${REENGAGE_COOLDOWN_DAYS}d).`
  );
  console.log(
    `Mode: ${send ? "🟢 SEND (will email each user)" : "🟡 DRY RUN (no emails will be sent)"}`
  );
  console.log("");
  console.log("Recipients:");
  for (const u of recipients) {
    console.log(`  ${u.email.padEnd(40)}  ${u.name}`);
  }

  if (!send) {
    console.log("\nDry run only. Re-run with --send to actually email these users.");
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("\n✗ RESEND_API_KEY not set in .env — cannot send.");
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log("\nSending in batches of 4 (1.1s gap)…");
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += 4) {
    const batch = recipients.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(async (u) => {
        const result = await sendOne(resend, u);
        if (result.ok) {
          await prisma.user.update({
            where: { id: u.id },
            data: { lastReengagementAt: new Date() },
          });
        }
        return { user: u, result };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.result.ok) {
        ok += 1;
        console.log(`  ✓ ${r.value.user.email}`);
      } else {
        failed += 1;
        const reason =
          r.status === "rejected"
            ? String(r.reason)
            : r.value.result.error ?? "unknown error";
        const email = r.status === "fulfilled" ? r.value.user.email : "(batch error)";
        console.log(`  ✗ ${email}  — ${reason}`);
      }
    }
    if (i + 4 < recipients.length) await new Promise((res) => setTimeout(res, 1100));
  }

  console.log(`\nDone — ${ok} sent, ${failed} failed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
