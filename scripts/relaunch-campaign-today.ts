import { prisma } from "../src/lib/db";

// One-shot relaunch: shift the Arabic Telegram campaign to start today
// (2026-05-30) instead of tomorrow. Wipes the 6 unsent broadcasts that
// were originally scheduled for 2026-05-31 → 2026-06-02, then re-inserts
// the same 6 messages with Day 1 = today's still-reachable cron slots.
//
// Picked slots:
//   Day 1 (today): 11:00 UTC + 17:00 UTC  (06:00 already passed)
//   Day 2:         06:00 UTC + 17:00 UTC
//   Day 3:         06:00 UTC + 17:00 UTC
//
// The Telegram cron drainer runs at 06:00, 11:00, and 17:00 UTC every
// day, so each scheduled time matches a real cron firing.
//
// Usage:
//   npx tsx --env-file=.env scripts/relaunch-campaign-today.ts

const SITE = "https://medexamhub.org";
const PROMO_CODE = "TGAR20";
const PROMO_LINK = `${SITE}/plans?promo=${PROMO_CODE}`;
const QUESTION_LINK = `${SITE}/exam/new`;

type Slot = { dayOffset: number; utcHour: number };

type Post = {
  kind: "advice" | "question" | "promo";
  slot: Slot;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
};

const POSTS: Post[] = [
  // ─── DAY 1 — today ──────────────────────────────────────────────────
  {
    kind: "promo",
    slot: { dayOffset: 0, utcHour: 11 },
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
    slot: { dayOffset: 0, utcHour: 17 },
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
    slot: { dayOffset: 1, utcHour: 6 },
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
    slot: { dayOffset: 1, utcHour: 17 },
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
    slot: { dayOffset: 2, utcHour: 6 },
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
    slot: { dayOffset: 2, utcHour: 17 },
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

function utcDateAt(baseDate: Date, hourUtc: number): Date {
  const d = new Date(baseDate);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

async function main() {
  // Anchor on today's UTC midnight.
  const todayUtcMidnight = new Date();
  todayUtcMidnight.setUTCHours(0, 0, 0, 0);

  console.log(`Relaunching Arabic campaign starting ${todayUtcMidnight.toISOString().slice(0, 10)} UTC.`);

  // Wipe every unsent ScheduledBroadcast row that's still in the future
  // (i.e. the 6 rows from the original tomorrow-onwards schedule). Already-
  // sent rows are preserved as historical record.
  const cutoff = new Date();
  const wiped = await prisma.scheduledBroadcast.deleteMany({
    where: { sent: false, scheduledFor: { gte: cutoff } },
  });
  console.log(`Cleared ${wiped.count} unsent future scheduled broadcasts.`);

  let inserted = 0;
  for (const post of POSTS) {
    const dayDate = new Date(todayUtcMidnight);
    dayDate.setUTCDate(dayDate.getUTCDate() + post.slot.dayOffset);
    const scheduledFor = utcDateAt(dayDate, post.slot.utcHour);

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

  console.log(`\nDone — ${inserted} posts scheduled.`);
  console.log("Next cron run will pick up any that are already past their scheduledFor.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
