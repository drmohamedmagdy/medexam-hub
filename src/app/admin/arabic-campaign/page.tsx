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

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; margin:0; padding:24px; color:#111; line-height:1.7; background:#fafafa;">
<div dir="rtl" style="text-align:right; max-width:560px; margin:0 auto; background:#ffffff; padding:32px 28px; border-radius:12px; border:1px solid #eee;">
  <p style="font-size:16px; margin:0 0 16px;">أهلاً ${firstName} 👋</p>
  <p style="font-size:16px; margin:0 0 16px;"><b>مش ناوي تشترك معانا وتستفيد بخدماتنا كاملة؟</b> 🤔</p>
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
  <p style="font-size:14px; margin:16px 0 0; color:#666;">تحياتنا،<br/><b>فريق MedExam Hub</b></p>
  <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
  <p style="font-size:11px; color:#888; line-height:1.5; text-align:right;">
    وصلك الإيميل ده لأن عندك حساب على MedExam Hub.
    لو مش عايز إيميلات تسويقية، <a href="${unsubUrl}" style="color:#888;">اضغط هنا لإلغاء الاشتراك</a>.<br/>
    MedExam Hub · For medical education only.
  </p>
</div>
</body></html>`;
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
