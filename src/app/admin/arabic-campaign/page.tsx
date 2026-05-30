import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendEmail, makeUnsubToken } from "@/lib/email";

// Vercel serverless function budget — sending 36 emails at 4/batch with
// 1.1s gap fits in ~12s, well under this ceiling on Pro. Stays at 10s
// on Hobby which is tight; if you hit a timeout, switch to background.
export const maxDuration = 60;
export const metadata = { title: "Admin — Arabic re-engagement campaign" };

// ─────────────────────────────────────────────────────────────────────────────
// Recipient filter (mirrors scripts/send-arabic-reengagement.ts)
// ─────────────────────────────────────────────────────────────────────────────

const ARABIC_RE = /[؀-ۿ]/;
const REENGAGE_COOLDOWN_DAYS = 14;

const ARABIC_NAME_TOKENS: ReadonlyArray<string> = [
  "mohamed", "mohammed", "mohammad", "muhammad", "mahmoud", "mahmood", "mahmud",
  "ahmed", "ahmad", "achmed", "ali", "aly", "omar", "umar", "khaled", "khalid",
  "hassan", "hasan", "hussam", "husam", "hussein", "hossein", "hussain", "husain",
  "ibrahim", "ebrahim", "ibraheem", "ebraheim", "yusuf", "youssef", "yousef",
  "yusef", "yosef", "yosof", "yousif", "saif", "sayf", "walid", "waleed", "wael",
  "fares", "faris", "abdallah", "abdulla", "abdullah", "abdelrahman",
  "abdulrahman", "abdurrahman", "abdelrhman", "abdelkader", "abdulqadir",
  "abdelaziz", "abdulaziz", "abdelsamie", "abdussamie", "abdelsalam",
  "abdelhady", "abdelfattah", "abdelhamid", "adel", "adil", "ayman", "aiman",
  "atef", "atif", "anwar", "anouar", "anas", "aziz", "azeez", "azim", "bahaa",
  "baha", "bassam", "bassem", "bilal", "belal", "emad", "imad", "ehab", "eyad",
  "iyad", "fadi", "faisal", "faysal", "farouk", "farouq", "faruq", "fathi",
  "fathy", "fouad", "fuad", "hany", "hani", "hatem", "hatim", "haitham",
  "hesham", "hisham", "hamdy", "hamdi", "hamdan", "karim", "kareem", "magdy",
  "magdi", "maged", "magid", "maher", "mahir", "mansour", "mansoor", "moataz",
  "mostafa", "mustafa", "mustapha", "mounir", "munir", "nabil", "nader",
  "nadir", "nasser", "naser", "nizar", "nezar", "osama", "usama", "rabie",
  "raby", "ramy", "rami", "reda", "rida", "refaat", "rifaat", "rafat", "sami",
  "samy", "said", "sayed", "saied", "salah", "salem", "saleh", "shaaban",
  "shabaan", "sherif", "sharif", "tarek", "tareq", "tariq", "tamer", "tamir",
  "wagdi", "wagdy", "wahid", "waheed", "yahya", "yehia", "yahia", "yasser",
  "yaser", "yasir", "ziad", "zeyad", "ziyad",
  "fatma", "fatima", "fatimah", "aisha", "ayesha", "aysha", "mariam", "maryam",
  "marym", "noor", "nour", "nora", "norah", "sara", "sarah", "salma", "salwa",
  "heba", "hiba", "hala", "rasha", "walaa", "rehab", "rihab", "hanan", "toqa",
  "toka", "marwa", "marwah", "hasnaa", "hasna", "souad", "soad", "suad",
  "naglaa", "nagla", "shrooq", "shoroq", "shuruq", "alaa", "amira", "ameera",
  "yasmin", "yasmine", "yasemin", "manar", "shaimaa", "amal", "amani", "asmaa",
  "asma", "menna", "minna", "meran", "mirna", "marina", "rana", "ola", "shahd",
  "doaa", "dua", "sahar", "soha", "lina", "layla", "laila", "leila", "dina",
  "deena", "dalia", "hoda", "houda", "mona", "maha", "mai", "may", "reem",
  "rim", "rania", "reham", "samar", "sondos", "sundus", "zeinab", "zainab",
  "zaynab", "habiba", "donia", "dunia", "jihan", "jehan", "eman", "iman",
  "engy", "engi", "doha", "aya", "lubna", "ghadeer", "ghada", "nada",
  "tasneem", "tasnim", "rehana", "vona",
  "elhenawy", "el-henawy", "elkorany", "elmoamly", "elbahat", "alkhalifah",
  "alzayyan", "abdelhady", "mady", "shabaan", "shaaban", "refaat", "emam",
  "ayyash",
];

const ARABIC_NAME_WORD_PREFIXES: ReadonlyArray<string> = [
  "el-", "al-", "abu", "abdel", "abdul", "abd ", "el ", "al ",
];

function looksArabic(name: string): boolean {
  if (ARABIC_RE.test(name)) return true;
  const lower = name.toLowerCase();
  for (const t of ARABIC_NAME_TOKENS) if (lower.includes(t)) return true;
  const words = lower.split(/\s+/);
  for (const w of words) {
    for (const p of ARABIC_NAME_WORD_PREFIXES) if (w.startsWith(p)) return true;
  }
  return false;
}

type Recipient = { id: string; email: string; name: string | null };

async function fetchRecipients(): Promise<Recipient[]> {
  const cutoff = new Date(Date.now() - REENGAGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      plan: "FREE",
      emailMarketing: true,
      OR: [{ lastReengagementAt: null }, { lastReengagementAt: { lt: cutoff } }],
      name: { not: null },
    },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return candidates
    .filter((u) => u.name && looksArabic(u.name))
    .map(({ id, email, name }) => ({ id, email, name }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Email body
// ─────────────────────────────────────────────────────────────────────────────

const PROMO_CODE = "TGAR20";
const SITE = "https://medexamhub.org";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstNameOf(fullName: string | null): string {
  if (!fullName) return "صديقنا";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "صديقنا";
}

function buildArabicReengagementHtml(userId: string, fullName: string | null): string {
  const firstName = escapeHtml(firstNameOf(fullName));
  const ctaUrl = `${SITE}/plans?promo=${PROMO_CODE}`;
  const unsubUrl = `${SITE}/api/email/unsubscribe?token=${makeUnsubToken(userId, "marketing")}`;

  // Table-based layout is the industry standard for HTML emails because
  // Outlook, Yahoo, and many mobile clients strip or partially honor CSS.
  // The previous div-based template collapsed in Gmail (background color
  // box disappeared, "rounded" CTA rendered as plain link). Tables with
  // bgcolor attributes + inline styles render identically everywhere.
  const FONT_STACK = `'Segoe UI', Tahoma, Arial, 'Helvetica Neue', Helvetica, sans-serif`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MedExam Hub</title>
</head>
<body dir="rtl" style="margin:0; padding:0; background-color:#f5f5f5; font-family:${FONT_STACK};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f5f5" style="background-color:#f5f5f5;">
  <tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">

      <!-- top spacer -->
      <tr><td style="height:28px; line-height:28px; font-size:0;">&nbsp;</td></tr>

      <!-- greeting + intro -->
      <tr><td style="padding:0 28px;">
        <p dir="rtl" style="margin:0 0 14px; font-family:${FONT_STACK}; font-size:17px; color:#111; line-height:1.7; text-align:right;">
          أهلاً ${firstName} 👋
        </p>
        <p dir="rtl" style="margin:0 0 14px; font-family:${FONT_STACK}; font-size:17px; color:#111; line-height:1.7; text-align:right;">
          <strong>مش ناوي تشترك معانا وتستفيد بخدماتنا كاملة؟</strong> 🤔
        </p>
        <p dir="rtl" style="margin:0 0 18px; font-family:${FONT_STACK}; font-size:15px; color:#333; line-height:1.8; text-align:right;">
          إحنا في <strong>MedExam Hub</strong> بنساعد آلاف الأطباء وطلاب الطب
          يتحضّروا لامتحاناتهم بأسلوب جديد كلياً — وحبّينا نفكّرك إنك ممكن تستفيد أكتر بكتير.
        </p>
      </td></tr>

      <!-- features list (one row per item — robust across clients) -->
      <tr><td style="padding:0 28px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td dir="rtl" style="padding:5px 0; font-family:${FONT_STACK}; font-size:15px; color:#333; text-align:right; line-height:1.6;">✅ آلاف الأسئلة المُولَّدة بالـ AI في كل التخصصات</td></tr>
          <tr><td dir="rtl" style="padding:5px 0; font-family:${FONT_STACK}; font-size:15px; color:#333; text-align:right; line-height:1.6;">✅ امتحانات تجريبية موقّتة بمعايير الامتحانات الحقيقية</td></tr>
          <tr><td dir="rtl" style="padding:5px 0; font-family:${FONT_STACK}; font-size:15px; color:#333; text-align:right; line-height:1.6;">✅ مراجعة الإجابات الخاطئة تلقائياً (spaced repetition)</td></tr>
          <tr><td dir="rtl" style="padding:5px 0; font-family:${FONT_STACK}; font-size:15px; color:#333; text-align:right; line-height:1.6;">✅ شهادات إتمام موثّقة تضيفها لـ CV</td></tr>
          <tr><td dir="rtl" style="padding:5px 0; font-family:${FONT_STACK}; font-size:15px; color:#333; text-align:right; line-height:1.6;">✅ تحضير لـ USMLE · MRCP · PLAB · امتحانات النيابة المصرية</td></tr>
        </table>
      </td></tr>

      <!-- promo box (nested table with bgcolor so Outlook honors it) -->
      <tr><td style="padding:24px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#eff6ff" style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:12px;">
          <tr><td style="padding:20px 24px;">
            <p dir="rtl" style="margin:0 0 10px; font-family:${FONT_STACK}; font-size:16px; color:#1e3a8a; text-align:right;">
              🎁 <strong>عرض خاص ليك</strong>
            </p>
            <p dir="rtl" style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:14px; color:#1f2937; line-height:1.8; text-align:right;">
              استخدم الكود
              <span style="display:inline-block; direction:ltr; font-family:Consolas,Menlo,monospace; background-color:#ffffff; color:#1e40af; padding:3px 10px; border-radius:4px; font-weight:bold; border:1px solid #93c5fd;">TGAR20</span>
              واحصل على خصم <strong>20%</strong> على أي خطة مدفوعة.<br>
              العرض ساري حتى يوم <strong>3 يونيو</strong>.
            </p>
            <!-- CTA button: table with bgcolor renders as solid button
                 in every client (Outlook included). -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" bgcolor="#2563eb" style="background-color:#2563eb; border-radius:8px;">
                <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; font-family:${FONT_STACK}; font-size:15px; color:#ffffff; text-decoration:none; font-weight:600; border-radius:8px;">
                  اشترك الآن واحصل على الخصم ←
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- closing -->
      <tr><td style="padding:4px 28px 0;">
        <p dir="rtl" style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:14px; color:#4b5563; line-height:1.8; text-align:right;">
          لو عندك أي سؤال أو حابب تعرف الخطة الأنسب ليك،
          رد على الإيميل ده وهنرد عليك شخصياً.
        </p>
        <p dir="rtl" style="margin:0; font-family:${FONT_STACK}; font-size:14px; color:#6b7280; line-height:1.8; text-align:right;">
          تحياتنا،<br>
          <strong>فريق MedExam Hub</strong>
        </p>
      </td></tr>

      <!-- divider -->
      <tr><td style="padding:20px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="border-top:1px solid #e5e7eb; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
      </td></tr>

      <!-- footer / unsubscribe -->
      <tr><td style="padding:0 28px 28px;">
        <p dir="rtl" style="margin:0; font-family:${FONT_STACK}; font-size:11px; color:#9ca3af; line-height:1.6; text-align:right;">
          وصلك الإيميل ده لأن عندك حساب على MedExam Hub.<br>
          لو مش عايز إيميلات تسويقية، <a href="${unsubUrl}" style="color:#6b7280; text-decoration:underline;">اضغط هنا لإلغاء الاشتراك</a>.<br>
          MedExam Hub · For medical education only.
        </p>
      </td></tr>

    </table>

  </td></tr>
</table>
</body>
</html>`;
}

const SUBJECT = "مش ناوي تشترك معانا؟ 🩺";

// ─────────────────────────────────────────────────────────────────────────────
// Server Action — runs in Vercel where RESEND_API_KEY is set
// ─────────────────────────────────────────────────────────────────────────────

type RunResult = { ok: number; failed: number; recipients: string[]; errors: string[] };

async function runCampaign(mode: "test" | "blast"): Promise<RunResult> {
  "use server";
  const admin = await requireAdmin();

  const recipients: Recipient[] =
    mode === "test"
      ? [{ id: admin.id, email: admin.email, name: admin.name }]
      : await fetchRecipients();

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  const sentTo: string[] = [];

  for (let i = 0; i < recipients.length; i += 4) {
    const batch = recipients.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(async (u) => {
        const html = buildArabicReengagementHtml(u.id, u.name);
        const result = await sendEmail({
          toUserId: u.id,
          toEmail: u.email,
          subject: SUBJECT,
          category: "reengagement",
          html,
        });
        // Only bump lastReengagementAt on real blast sends, not on the
        // admin self-test (so the admin stays eligible if they appear
        // in the recipient list later).
        if (result.ok && mode === "blast") {
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
        sentTo.push(r.value.user.email);
      } else {
        failed += 1;
        const reason =
          r.status === "rejected"
            ? String(r.reason)
            : r.value.result.error ?? "unknown error";
        const email = r.status === "fulfilled" ? r.value.user.email : "(batch error)";
        errors.push(`${email}: ${reason}`);
      }
    }
    if (i + 4 < recipients.length) await new Promise((res) => setTimeout(res, 1100));
  }

  return { ok, failed, recipients: sentTo, errors };
}

async function runTestAction(): Promise<RunResult> {
  "use server";
  return runCampaign("test");
}

async function runBlastAction(): Promise<RunResult> {
  "use server";
  return runCampaign("blast");
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminArabicCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireAdmin();
  const recipients = await fetchRecipients();
  const params = await searchParams;
  const result: RunResult | null = params.result ? JSON.parse(params.result) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arabic re-engagement campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One-shot email blast to FREE-plan users with Arabic-detected names,
          promoting the TGAR20 promo. Uses the Vercel-hosted RESEND_API_KEY.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Eligible recipients: {recipients.length}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          FREE plan · emailMarketing=true · not re-engaged in last {REENGAGE_COOLDOWN_DAYS}d ·
          name matches Arabic heuristic
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-cyan-300">
            Show full list
          </summary>
          <ul className="mt-2 max-h-72 overflow-y-auto rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
            {recipients.map((u) => (
              <li key={u.id} className="py-0.5 font-mono">
                {u.email.padEnd(40)} {u.name}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.failed === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          <p className="font-medium">
            ✓ Sent {result.ok} · ✗ Failed {result.failed}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Errors</summary>
              <ul className="mt-1 text-xs">
                {result.errors.map((e, i) => (
                  <li key={i} className="py-0.5">{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Send</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Start with a test to your own inbox. The blast bumps each recipient's
          lastReengagementAt so they're skipped for {REENGAGE_COOLDOWN_DAYS} days.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <form
            action={async () => {
              "use server";
              const r = await runTestAction();
              const { redirect } = await import("next/navigation");
              redirect(`/admin/arabic-campaign?result=${encodeURIComponent(JSON.stringify(r))}`);
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send test to my inbox
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              const r = await runBlastAction();
              const { redirect } = await import("next/navigation");
              redirect(`/admin/arabic-campaign?result=${encodeURIComponent(JSON.stringify(r))}`);
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send to all {recipients.length} recipients
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
