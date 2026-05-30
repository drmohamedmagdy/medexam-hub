import { prisma } from "../src/lib/db";

// 3-day Arabic campaign targeted at the Telegram channel audience.
// Inserts 6 ScheduledBroadcast rows (2/day × 3 days) and creates the
// shared TGAR20 promo code referenced by every subscription post.
//
// Slots used per day (Cairo time): 09:00 + 20:00 — morning push for the
// commute, evening push for study time. Skips the 14:00 slot so this
// campaign doesn't overlap the regular 3-slot daily schedule.
//
// NOT idempotent the same way as seed-scheduled-broadcasts.ts: this
// script only inserts what isn't already there. Safe to re-run after a
// partial failure; re-runs after success will throw on the unique
// `code` constraint for the promo, which is the intended signal that
// the campaign already exists.
//
// Usage:
//   npx tsx --env-file=.env scripts/seed-arabic-3day-campaign.ts
//   npx tsx --env-file=.env scripts/seed-arabic-3day-campaign.ts --start 2026-05-31

const SITE = "https://medexamhub.org";
const PROMO_CODE = "TGAR20";
const PROMO_LINK = `${SITE}/plans?promo=${PROMO_CODE}`;
const QUESTION_LINK = `${SITE}/exam/new`;

type PostKind = "advice" | "question" | "promo";

type Post = {
  kind: PostKind;
  scheduledHourCairo: number; // 9 or 20
  dayOffset: number; // 0, 1, 2
  text: string;
  ctaLabel: string;
  ctaUrl: string;
};

// Telegram HTML parse mode supports: <b>, <i>, <u>, <s>, <a href>,
// <code>, <pre>, <span class="tg-spoiler">. Arabic flows naturally —
// no escaping needed beyond the literal &, <, > characters (none here).
const POSTS: Post[] = [
  // ─── DAY 1 ──────────────────────────────────────────────────────────
  {
    kind: "promo",
    dayOffset: 0,
    scheduledHourCairo: 9,
    text:
      "🩺 <b>للأطباء وطلاب الطب</b>\n\n" +
      "استعدّ لامتحاناتك مع <b>MedExam Hub</b> — منصّة توليد الأسئلة بالذكاء الاصطناعي.\n\n" +
      "✅ آلاف الأسئلة في كل التخصصات\n" +
      "✅ اختبارات تجريبية موقّتة بمعايير الامتحانات الحقيقية\n" +
      "✅ مراجعة الإجابات الخاطئة تلقائياً بنظام الـ spaced repetition\n" +
      "✅ شهادات إتمام موثّقة\n\n" +
      "🎁 <b>عرض خاص لمشتركي القناة</b>\n" +
      `استخدم الكود <code>${PROMO_CODE}</code> واحصل على خصم 20% على جميع الخطط المدفوعة.\n\n` +
      "العرض ساري حتى يوم الثلاثاء. اشترك الآن وارفع مستواك في الامتحان القادم.",
    ctaLabel: "اشترك الآن ←",
    ctaUrl: PROMO_LINK,
  },
  {
    kind: "question",
    dayOffset: 0,
    scheduledHourCairo: 20,
    text:
      "🩺 <b>سؤال اليوم</b>\n\n" +
      "مريض عمره 55 سنة يشكو من ألم صدري نموذجي يستمر 20 دقيقة، يخفّ بالراحة. " +
      "تخطيط القلب يظهر انخفاضاً عابراً في ST في الاشتقاقات II, III, aVF. " +
      "التروبونين طبيعي.\n\n" +
      "ما التشخيص الأرجح؟\n\n" +
      "A) احتشاء جدار سفلي حاد STEMI\n" +
      "B) ذبحة صدرية غير مستقرة\n" +
      "C) التهاب التامور\n" +
      "D) التهاب عضلة القلب\n\n" +
      "<span class=\"tg-spoiler\"><b>الإجابة: B</b> — الذبحة الصدرية غير المستقرة. " +
      "ألم نموذجي يخفّ بالراحة + تغيّرات ST عابرة + تروبونين طبيعي = نقص تروية بدون احتشاء كامل.</span>",
    ctaLabel: "تدرّب على المنصة ←",
    ctaUrl: QUESTION_LINK,
  },

  // ─── DAY 2 ──────────────────────────────────────────────────────────
  {
    kind: "promo",
    dayOffset: 1,
    scheduledHourCairo: 9,
    text:
      "📚 <b>اشتراك واحد، تحضير كامل</b>\n\n" +
      "في <b>MedExam Hub</b>، باشتراك واحد تحصل على:\n\n" +
      "🎯 USMLE · MRCP · PLAB · امتحانات النيابة المصرية\n" +
      "🎯 توليد امتحانات بمواصفاتك بالضبط في 30 ثانية\n" +
      "🎯 إحصائيات أداء تفصيلية لكل تخصص ولكل نوع سؤال\n" +
      "🎯 مكتبة ملاحظات + ملخّصات تُولَّد من ملفّاتك\n\n" +
      "💰 <b>خصم 20% للمشتركين من القناة</b>\n" +
      `الكود: <code>${PROMO_CODE}</code> — ساري حتى الثلاثاء فقط.\n\n` +
      "اشترك اليوم. ابدأ تستفيد من الغد.",
    ctaLabel: "اعرض الخطط ←",
    ctaUrl: PROMO_LINK,
  },
  {
    kind: "question",
    dayOffset: 1,
    scheduledHourCairo: 20,
    text:
      "🩺 <b>سؤال اليوم — طب الأطفال</b>\n\n" +
      "طفل عمره 4 سنوات يأتي بحرارة 39° منذ 5 أيام، مع طفح جلدي منتشر، " +
      "احمرار ملتحمة العينين بدون إفرازات، تشقّق وحمرة الشفاه واللسان الفراولي، " +
      "وتورّم اليدين والقدمين.\n\n" +
      "ما التشخيص الأرجح؟\n\n" +
      "A) حمى قرمزية\n" +
      "B) داء كاواساكي\n" +
      "C) متلازمة ستيفنز-جونسون\n" +
      "D) الحصبة\n\n" +
      "<span class=\"tg-spoiler\"><b>الإجابة: B</b> — داء كاواساكي. " +
      "خمسة معايير: حمى ≥5 أيام + 4 من التالي: التهاب ملتحمة، طفح، " +
      "تشقّق الشفاه/لسان فراولي، تغيّرات الأطراف، اعتلال عقد لمفية رقبية. " +
      "علاج عاجل بـ IVIG لتجنّب أمهات الشريان التاجي.</span>",
    ctaLabel: "أسئلة أطفال أكتر ←",
    ctaUrl: QUESTION_LINK,
  },

  // ─── DAY 3 ──────────────────────────────────────────────────────────
  {
    kind: "promo",
    dayOffset: 2,
    scheduledHourCairo: 9,
    text:
      "🚀 <b>آخر يوم — عرض القناة ينتهي الليلة</b>\n\n" +
      `الكود <code>${PROMO_CODE}</code> ساري لـ 24 ساعة فقط.\n` +
      "خصم 20% على كل الخطط المدفوعة في <b>MedExam Hub</b>.\n\n" +
      "ابدأ تحضيرك الذكي:\n" +
      "✓ امتحانات AI بمعاييرك\n" +
      "✓ مراجعة ذكية بالـ spaced repetition\n" +
      "✓ إحصائيات تتبّع تقدّمك أسبوع بأسبوع\n" +
      "✓ شهادات تثبت إنجازك\n\n" +
      "كل ده بسعر أقل من فنجان قهوة في الأسبوع.",
    ctaLabel: "احصل على الخصم ←",
    ctaUrl: PROMO_LINK,
  },
  {
    kind: "question",
    dayOffset: 2,
    scheduledHourCairo: 20,
    text:
      "🩺 <b>سؤال اليوم — غدد صماء</b>\n\n" +
      "سيدة عمرها 35 سنة، تشكو من تعب شديد، زيادة وزن 6 كجم خلال 3 شهور، " +
      "برودة في الأطراف، وإمساك مزمن.\n" +
      "الفحوصات: TSH = 12 mIU/L (مرتفع)، Free T4 = 0.5 ng/dL (منخفض).\n\n" +
      "ما التشخيص الأقرب؟\n\n" +
      "A) قصور الغدة الدرقية الأوّلي\n" +
      "B) قصور الغدة الدرقية الثانوي (مركزي)\n" +
      "C) فرط نشاط الغدة الدرقية\n" +
      "D) التهاب درقية تحت الحاد\n\n" +
      "<span class=\"tg-spoiler\"><b>الإجابة: A</b> — قصور الغدة الدرقية الأولي. " +
      "TSH مرتفع + Free T4 منخفض = خلل في الغدة نفسها. لو كان ثانوياً، " +
      "الـ TSH هيكون منخفض أو طبيعي. العلاج: levothyroxine.</span>\n\n" +
      `💪 العرض ينتهي الليلة — الكود <code>${PROMO_CODE}</code> لخصم 20%.`,
    ctaLabel: "اشترك بخصم 20% ←",
    ctaUrl: PROMO_LINK,
  },
];

function cairoDateAt(baseDate: Date, hourCairo: number): Date {
  // Cairo = UTC+3 year-round per this codebase's convention.
  const utcHour = hourCairo - 3;
  const d = new Date(baseDate);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}

async function ensurePromoCode(expiresAt: Date) {
  const existing = await prisma.promoCode.findUnique({
    where: { code: PROMO_CODE },
  });
  if (existing) {
    console.log(`PromoCode ${PROMO_CODE} already exists — leaving untouched.`);
    return existing;
  }
  const created = await prisma.promoCode.create({
    data: {
      code: PROMO_CODE,
      discountType: "PERCENT",
      discountValue: 20,
      // JSON-encoded array. Empty string means "all paid plans" in this
      // codebase's convention, but we want to be explicit.
      applicablePlans: JSON.stringify(["BASIC", "PRO", "PREMIUM"]),
      maxUses: 500,
      maxUsesPerUser: 1,
      expiresAt,
      isActive: true,
      notes: "Arabic Telegram channel 3-day campaign 2026-05-31 → 2026-06-02",
    },
  });
  console.log(`Created PromoCode ${PROMO_CODE} (20% off, expires ${expiresAt.toISOString()})`);
  return created;
}

async function main() {
  const startArgIdx = process.argv.indexOf("--start");
  const startInput = startArgIdx > -1 ? process.argv[startArgIdx + 1] : null;

  // Default start = tomorrow (Cairo). Override with --start YYYY-MM-DD.
  // Cairo day boundary is 21:00 UTC the previous calendar day; we use
  // UTC midnight as a stable anchor and rely on cairoDateAt for the
  // scheduled times themselves.
  const startDate = startInput
    ? new Date(startInput + "T00:00:00.000Z")
    : (() => {
        const t = new Date();
        t.setUTCHours(0, 0, 0, 0);
        t.setUTCDate(t.getUTCDate() + 1);
        return t;
      })();

  console.log(
    `Seeding 3-day Arabic campaign starting ${startDate.toISOString().slice(0, 10)} Cairo`
  );

  // Promo expires the day after the last scheduled post (Day 3 evening),
  // at 23:59 Cairo = 20:59 UTC.
  const lastDay = new Date(startDate);
  lastDay.setUTCDate(lastDay.getUTCDate() + 3);
  lastDay.setUTCHours(20, 59, 0, 0);
  await ensurePromoCode(lastDay);

  let inserted = 0;
  let skipped = 0;
  for (const post of POSTS) {
    const dayDate = new Date(startDate);
    dayDate.setUTCDate(dayDate.getUTCDate() + post.dayOffset);
    const scheduledFor = cairoDateAt(dayDate, post.scheduledHourCairo);

    // Skip if an identical row already exists (text + scheduledFor match).
    // Lets us re-run after a partial failure without duplicating posts.
    const dup = await prisma.scheduledBroadcast.findFirst({
      where: { scheduledFor, text: post.text },
      select: { id: true },
    });
    if (dup) {
      console.log(
        `  ${scheduledFor.toISOString()}  [skip] already scheduled`
      );
      skipped += 1;
      continue;
    }

    await prisma.scheduledBroadcast.create({
      data: {
        scheduledFor,
        kind: post.kind,
        text: post.text,
        ctaLabel: post.ctaLabel,
        ctaUrl: post.ctaUrl,
      },
    });
    inserted += 1;
    const firstLine = post.text.split("\n")[0]!.replace(/<[^>]+>/g, "");
    console.log(
      `  ${scheduledFor.toISOString()}  ${post.kind.padEnd(9)}  ${firstLine.slice(0, 60)}`
    );
  }

  console.log(`\nDone — ${inserted} posts scheduled, ${skipped} skipped (dups).`);
  console.log(
    "View at https://medexamhub.org/admin/scheduled-broadcasts and /admin/promos"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
