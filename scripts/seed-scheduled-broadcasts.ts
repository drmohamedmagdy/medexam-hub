import { prisma } from "../src/lib/db";

// Seed 30 ScheduledBroadcast rows = 3 posts/day × 10 days, starting
// tomorrow. Three slots per day:
//   - 09:00 Cairo (06:00 UTC) — study advice
//   - 14:00 Cairo (11:00 UTC) — sample question
//   - 20:00 Cairo (17:00 UTC) — promo / community
//
// Idempotent re-run safe: wipes any unsent future ScheduledBroadcast
// rows first (so re-running gives you a clean schedule), then inserts.
// Already-sent rows are preserved as history.
//
// Usage:
//   npx tsx --env-file=.env scripts/seed-scheduled-broadcasts.ts
//   (or)
//   npx tsx --env-file=.env scripts/seed-scheduled-broadcasts.ts --start 2026-05-15
//
// All posts use Telegram HTML parse mode. CTA button on most posts
// drives traffic to medexamhub.org with STUDY30 promo.

const SITE = "https://medexamhub.org";
const PROMO = "STUDY30";

type PostKind = "advice" | "question" | "promo";

type PostTemplate = {
  kind: PostKind;
  text: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

// 30 posts, indexed by (day - 1) * 3 + slot (0=morning, 1=afternoon, 2=evening)
const POSTS: PostTemplate[] = [
  // ─── DAY 1 ───
  {
    kind: "advice",
    text:
      "☀️ <b>Good morning, doctors-in-training</b>\n\n" +
      "Study tip #1 — <b>start with the WHY, not the WHAT.</b>\n\n" +
      "Memorising that ACE inhibitors cause cough is a fact. " +
      "Understanding that they prevent bradykinin breakdown <i>is</i> the pharmacology. " +
      "When you know the mechanism, you don't need to memorise the side effects — they fall out automatically.\n\n" +
      "Generate a question on any specialty and read the explanation first. The MCQ is the test, the explanation is the lesson.",
    ctaLabel: "Generate a question →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Internal Medicine\n\n" +
      "A 58-year-old man with a 30-pack-year smoking history presents with progressive dyspnoea, weight loss, and a chronic cough. Chest X-ray shows a 4 cm right upper lobe mass. Sodium is 122 mmol/L.\n\n" +
      "Which paraneoplastic syndrome is most likely?\n\n" +
      "A. SIADH\n" +
      "B. Ectopic ACTH\n" +
      "C. Hypercalcaemia of malignancy\n" +
      "D. Lambert-Eaton syndrome\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">A — SIADH</span>\n\n" +
      "Small cell lung cancer is the classic cause of SIADH (hyponatraemia with euvolaemia and inappropriately concentrated urine). " +
      "Ectopic ACTH (B) also occurs with SCLC but presents with Cushingoid features. Hypercalcaemia (C) is more typical of squamous cell. Lambert-Eaton (D) is rare and presents with proximal weakness.",
    ctaLabel: "Practise full bank →",
    ctaUrl: `${SITE}/qotd`,
  },
  {
    kind: "promo",
    text:
      "🎁 <b>Launch week deal</b>\n\n" +
      "Use code <code>" + PROMO + "</code> for <b>30% off</b> any MedExam Hub plan — monthly or annual.\n\n" +
      "Annual save 25% on top, so combined with this promo you're paying <i>roughly half price</i> for the year. Code is limited to the first 200 redemptions.",
    ctaLabel: "View plans →",
    ctaUrl: `${SITE}/plans?promo=${PROMO}`,
  },

  // ─── DAY 2 ───
  {
    kind: "advice",
    text:
      "💡 <b>Memory technique: the Loci method</b>\n\n" +
      "Visualise a familiar room — your bedroom, your dorm, the lab. Place each piece of information at a specific location: the cranial nerves on the door, the brachial plexus on the desk, the cardiac cycle on the bed.\n\n" +
      "When you need to recall, mentally walk through the room. The Romans used this to memorise speeches. It still works for anatomy 2,000 years later.",
    ctaLabel: "Try a recall exam →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Cardiology\n\n" +
      "A 25-year-old woman presents with sudden chest pain and dyspnoea after a long flight. Heart rate 120, BP 95/60, SpO2 88% on room air. ECG shows S1Q3T3.\n\n" +
      "Most appropriate immediate investigation?\n\n" +
      "A. D-dimer\n" +
      "B. CT pulmonary angiogram\n" +
      "C. Echocardiogram\n" +
      "D. Ventilation-perfusion scan\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">B — CT pulmonary angiogram</span>\n\n" +
      "High pre-test probability PE (Wells score ≥4) — D-dimer is unhelpful (it's already going to be positive). Go straight to CTPA. " +
      "V/Q scan (D) is reserved for patients with contraindications to contrast (pregnancy, renal failure).",
    ctaLabel: "More cardio Qs →",
    ctaUrl: `${SITE}/specialty/cardiology`,
  },
  {
    kind: "promo",
    text:
      "📱 <b>Did you know?</b>\n\n" +
      "MedExam Hub installs as a phone app — no app store needed.\n\n" +
      "Open medexamhub.org in Chrome / Safari → tap 'Install' on the dashboard → full-screen icon on your home screen with offline asset caching. Works on iOS + Android.",
    ctaLabel: "Install now →",
    ctaUrl: `${SITE}/dashboard`,
  },

  // ─── DAY 3 ───
  {
    kind: "advice",
    text:
      "⏱ <b>The Pomodoro for medicine</b>\n\n" +
      "25 minutes of focused study + 5 minute break × 4 sessions, then a 30 minute longer rest.\n\n" +
      "For exam prep specifically: dedicate each 25-min block to <i>one focused goal</i> — \"clear 20 cardiology MCQs\" or \"review last week's wrong answers,\" not \"study cardiology.\"\n\n" +
      "Goals beat clocks. Clocks just stop you from spiralling.",
    ctaLabel: "Set up a Pomodoro exam →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Surgery / Acute abdomen\n\n" +
      "A 72-year-old with atrial fibrillation presents with sudden severe abdominal pain out of proportion to physical findings. Lactate 6.2 mmol/L. Abdomen is soft on examination.\n\n" +
      "Most likely diagnosis?\n\n" +
      "A. Diverticulitis\n" +
      "B. Acute mesenteric ischaemia\n" +
      "C. Perforated peptic ulcer\n" +
      "D. Sigmoid volvulus\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">B — Acute mesenteric ischaemia</span>\n\n" +
      "Classic triad: severe pain out of proportion to exam, AF (embolic source from atrial thrombus), raised lactate. CT angiography urgently. " +
      "Surgical emergency — every hour without revascularisation = bowel necrosis.",
    ctaLabel: "More surgery Qs →",
    ctaUrl: `${SITE}/specialty/surgery`,
  },
  {
    kind: "promo",
    text:
      "🎓 <b>Recruiting campus ambassadors</b>\n\n" +
      "We're looking for one ambassador per Egyptian medical school.\n\n" +
      "✓ Free Pro plan for the academic year (~8,400 EGP value)\n" +
      "✓ Batch promo code that earns referral credit\n" +
      "✓ Early access to new features\n" +
      "✓ LinkedIn rec at year-end\n\n" +
      "3-minute application. We review weekly.",
    ctaLabel: "Apply now →",
    ctaUrl: `${SITE}/ambassador`,
  },

  // ─── DAY 4 ───
  {
    kind: "advice",
    text:
      "🃏 <b>Spaced repetition isn't optional</b>\n\n" +
      "If you saw a question last week and got it wrong, your brain has lost ~40% of the explanation by now. Re-encounter it at days 1, 3, 7, 14, 30 and you keep 90%+.\n\n" +
      "Every wrong answer on MedExam Hub becomes a spaced-repetition card automatically. Clear /review daily — it's the highest-yield 10 minutes of your study day.",
    ctaLabel: "Open /review →",
    ctaUrl: `${SITE}/review`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Paediatrics\n\n" +
      "A 6-month-old has a head circumference at the 3rd centile (was 50th at birth). Growth and weight are otherwise normal.\n\n" +
      "Most appropriate next step?\n\n" +
      "A. Reassure — within normal range\n" +
      "B. Repeat in 4 weeks\n" +
      "C. Urgent neuroimaging\n" +
      "D. Genetic testing for chromosomal causes\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">C — Urgent neuroimaging</span>\n\n" +
      "Crossing centiles downwards on head circumference suggests acquired microcephaly. Causes include TORCH infections, hypoxic injury, metabolic disorders. " +
      "MRI brain + paediatric neurology referral. Don't wait — diagnostic window matters.",
    ctaLabel: "More paeds Qs →",
    ctaUrl: `${SITE}/specialty/pediatrics`,
  },
  {
    kind: "promo",
    text:
      "💰 <b>Annual plan = effectively free months</b>\n\n" +
      "12-month billing saves 25% across all paid plans.\n\n" +
      "• <b>Basic</b>: 299 EGP/mo → 224/mo annual (3 free months/year)\n" +
      "• <b>Pro</b>: 699 EGP/mo → 524/mo annual\n" +
      "• <b>Premium</b>: 1,099 EGP/mo → 824/mo annual\n\n" +
      "Stack with <code>" + PROMO + "</code> for 30% off on top. Math:\n" +
      "Pro annual = 8,388 × 0.75 × 0.70 = <b>4,404 EGP for the full year</b>.",
    ctaLabel: "Pick a plan →",
    ctaUrl: `${SITE}/plans?promo=${PROMO}`,
  },

  // ─── DAY 5 ───
  {
    kind: "advice",
    text:
      "🌙 <b>Sleep is study</b>\n\n" +
      "The cliché is true: information consolidates into long-term memory during slow-wave + REM sleep. A 7-hour night beats a 5-hour night + an extra 2 hours of cramming, every time.\n\n" +
      "Practical: stop studying 90 minutes before bed. Read fiction. Walk. Your brain will literally file away the day's questions while you're unconscious.",
    ctaLabel: "Plan tomorrow's study →",
    ctaUrl: `${SITE}/dashboard`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Endocrine\n\n" +
      "A 30-year-old woman has palpitations, heat intolerance, 8 kg weight loss in 3 months, and a fine tremor. TSH undetectable, free T4 elevated, TSH-receptor antibodies positive.\n\n" +
      "Most appropriate first-line treatment?\n\n" +
      "A. Radioactive iodine\n" +
      "B. Total thyroidectomy\n" +
      "C. Carbimazole\n" +
      "D. Propranolol alone\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">C — Carbimazole</span>\n\n" +
      "Graves' disease in a young woman — antithyroid drugs are first-line for 12-18 months. " +
      "Radioactive iodine (A) is preferred in older patients or relapsed disease. Surgery (B) for large goitres or pregnancy concerns. Propranolol (D) is adjunct for symptom relief, not definitive.",
    ctaLabel: "Generate endocrine exam →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "🆓 <b>7-day Pro trial — every new signup</b>\n\n" +
      "New accounts start on Pro automatically for 7 days. That's 1,500 questions, mock exams, PDF export, image generation. After 7 days you drop to Free or pick a plan.\n\n" +
      "No card needed at signup. Try the full thing before committing.",
    ctaLabel: "Start the trial →",
    ctaUrl: `${SITE}/signup`,
  },

  // ─── DAY 6 ───
  {
    kind: "advice",
    text:
      "🎯 <b>Active recall beats re-reading</b>\n\n" +
      "Reading a textbook chapter twice doesn't teach you twice as well. It makes you <i>feel</i> like you know it because the words look familiar.\n\n" +
      "Test: close the book and write everything you remember on a blank page. Whatever you forgot is what you actually need to study.\n\n" +
      "MCQs do this for you automatically — every question is an active-recall workout.",
    ctaLabel: "Active-recall exam →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Nephrology\n\n" +
      "A 28-year-old man develops haematuria and hypertension 2 days after a sore throat. Urinalysis: red cell casts, 2+ protein. Complement C3 low, C4 normal. ASO titre elevated.\n\n" +
      "Most likely diagnosis?\n\n" +
      "A. IgA nephropathy\n" +
      "B. Post-streptococcal glomerulonephritis\n" +
      "C. Anti-GBM disease\n" +
      "D. ANCA-associated vasculitis\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">B — Post-streptococcal GN</span>\n\n" +
      "1-2 weeks post-strep, low C3 with normal C4 (alternative pathway), positive ASO titre. " +
      "IgA (A) presents <i>at</i> or 1-2 days after sore throat (synpharyngitic) — classic distinction. Anti-GBM (C) and ANCA (D) cause pulmonary-renal syndrome.",
    ctaLabel: "More nephro Qs →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "🎓 <b>Pass your mock → get a certificate</b>\n\n" +
      "Complete any mock exam with ≥70% on MedExam Hub and you get a downloadable PDF certificate with your name, score, date, and a unique cert number. Perfect for LinkedIn / CV.\n\n" +
      "Doctors keep posting theirs — join them.",
    ctaLabel: "Take a mock exam →",
    ctaUrl: `${SITE}/mock`,
  },

  // ─── DAY 7 ───
  {
    kind: "advice",
    text:
      "📵 <b>The 4-tab rule</b>\n\n" +
      "Open more than 4 browser tabs during study and your attention starts haemorrhaging. Limit yourself: MedExam Hub, your notes app, one reference (UpToDate / Medscape), one music tab. That's it.\n\n" +
      "Studies on multitasking show >2 tasks drop accuracy by 30-50%. You're not the exception.",
    ctaLabel: "Focus a 25-min session →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Neurology\n\n" +
      "A 24-year-old woman presents with right optic neuritis. MRI brain shows several periventricular white-matter lesions. CSF: oligoclonal bands positive.\n\n" +
      "Most appropriate next step?\n\n" +
      "A. High-dose IV methylprednisolone\n" +
      "B. Plasma exchange\n" +
      "C. Disease-modifying therapy alone\n" +
      "D. Observation\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">A — High-dose IV methylprednisolone</span>\n\n" +
      "Clinically isolated syndrome with MRI + CSF evidence of MS — acute optic neuritis treatment is 1 g IV methylprednisolone × 3-5 days. Speeds recovery but doesn't change long-term outcome. " +
      "DMT (C) is the long-term plan, started AFTER the acute attack treatment.",
    ctaLabel: "More neuro Qs →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "👥 <b>Community feed is live</b>\n\n" +
      "/community on MedExam Hub: post your tough cases, ask for help, share resources with other Egyptian med students and doctors.\n\n" +
      "No judgement, no \"are you sure that's a real question\" — just doctors helping doctors.",
    ctaLabel: "Visit the community →",
    ctaUrl: `${SITE}/community`,
  },

  // ─── DAY 8 ───
  {
    kind: "advice",
    text:
      "🧠 <b>Don't memorise lists — build trees</b>\n\n" +
      "20 causes of secondary hypertension is impossible to recall. 4 categories (renal / endocrine / vascular / drug-induced) with 5 things each is easy.\n\n" +
      "Always organise by mechanism, never by alphabetical order. When the exam asks for one, you walk down the tree to find it.",
    ctaLabel: "Test a mechanism question →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Haematology\n\n" +
      "A 60-year-old man has fatigue and bruising. Bloods: Hb 7.2, WBC 80, platelets 22. Blood film shows 60% blasts with Auer rods.\n\n" +
      "Most likely diagnosis?\n\n" +
      "A. Chronic myeloid leukaemia\n" +
      "B. Acute myeloid leukaemia\n" +
      "C. Acute lymphoblastic leukaemia\n" +
      "D. Myelodysplastic syndrome\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">B — Acute myeloid leukaemia</span>\n\n" +
      "Auer rods (eosinophilic needle-shaped inclusions) are pathognomonic for AML myeloid lineage. " +
      "Adult presentation, >20% blasts in marrow / blood = acute leukaemia. ALL (C) is more common in kids and lacks Auer rods. CML (A) has elevated mature myeloid cells, not blasts.",
    ctaLabel: "Drill haem Qs →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "📚 <b>Free medical library</b>\n\n" +
      "We host a free library of medical PDFs, summary notes, and AI-generated study notes at /library.\n\n" +
      "No paywall on the library itself — just searchable resources. Pro plans add the ability to upload your own PDFs and generate exams from them.",
    ctaLabel: "Browse the library →",
    ctaUrl: `${SITE}/library`,
  },

  // ─── DAY 9 ───
  {
    kind: "advice",
    text:
      "✍️ <b>Test under exam conditions</b>\n\n" +
      "If you only ever study with the answer key visible, you're not training for the exam — you're training to recognise familiar text.\n\n" +
      "Generate a full-length timed mock at least once a week in the final month. Same chair, same time limit, no phone, no checking. Your brain adapts to the conditions you practise under.",
    ctaLabel: "Take a timed mock →",
    ctaUrl: `${SITE}/mock`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Infectious disease\n\n" +
      "A 35-year-old returning from sub-Saharan Africa presents with fever, headache, and confusion 3 weeks after return. Blood film shows ring-form trophozoites in 8% of red cells.\n\n" +
      "Most appropriate immediate management?\n\n" +
      "A. Oral chloroquine\n" +
      "B. Oral atovaquone-proguanil\n" +
      "C. IV artesunate + intensive care\n" +
      "D. IV ceftriaxone\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">C — IV artesunate + ICU</span>\n\n" +
      "Severe falciparum malaria — features include parasitaemia >2%, cerebral malaria (confusion), pulmonary oedema, renal failure. IV artesunate is first-line; resistance has rendered quinine second-line. " +
      "Oral therapy (A, B) is for uncomplicated cases only.",
    ctaLabel: "More ID Qs →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "⏳ <b>STUDY30 promo ends soon</b>\n\n" +
      "30% off any paid plan with code <code>" + PROMO + "</code> — limited to first 200 redemptions, expires Dec 2026.\n\n" +
      "If you're prepping for a board exam this year, the math is overwhelming:\n" +
      "Basic annual = 2,691 EGP × 0.70 = <b>1,884 EGP for 12 months</b>. That's 157 EGP/month of full-tier study access.",
    ctaLabel: "Claim the discount →",
    ctaUrl: `${SITE}/plans?promo=${PROMO}`,
  },

  // ─── DAY 10 ───
  {
    kind: "advice",
    text:
      "🎯 <b>The final 48-hour rule</b>\n\n" +
      "Two days before any exam: <b>stop learning new material</b>. Switch entirely to review of what you already know. Cramming new content 48h out activates anxiety, not learning.\n\n" +
      "Spend the time on rapid-fire MCQs from topics you've covered. Pattern-recognition tightens. Confidence builds. Sleep matters more than any single fact you might have missed.",
    ctaLabel: "Quick review session →",
    ctaUrl: `${SITE}/review`,
  },
  {
    kind: "question",
    text:
      "🩺 <b>Question</b> · Emergency medicine\n\n" +
      "A 19-year-old presents with anaphylaxis after a peanut. BP 70/40, audible stridor, urticaria.\n\n" +
      "Most appropriate immediate management?\n\n" +
      "A. IV hydrocortisone 200 mg\n" +
      "B. IM adrenaline 0.5 mg (1:1000)\n" +
      "C. IV chlorphenamine 10 mg\n" +
      "D. Nebulised salbutamol\n\n" +
      "<b>Answer:</b> <span class=\"tg-spoiler\">B — IM adrenaline 0.5 mg</span>\n\n" +
      "Adrenaline is the only intervention proven to save life in anaphylaxis. <b>IM into the anterolateral thigh</b>, not subcut, not IV (IV risks arrhythmia outside ICU). " +
      "Steroids and antihistamines are adjuncts — they do nothing for the airway in the first 5 minutes. Repeat adrenaline every 5 min if no response.",
    ctaLabel: "More emergencies →",
    ctaUrl: `${SITE}/exam/new`,
  },
  {
    kind: "promo",
    text:
      "🚀 <b>You made it through 10 days of MedExam Hub content</b>\n\n" +
      "If the daily questions helped, the full bank is 5,000+ questions across every specialty, with mock exams, study notes generator, AI tutor chat, and spaced-repetition review.\n\n" +
      "Use <code>" + PROMO + "</code> for 30% off if you want all of it. We're not going anywhere — but the promo code is.",
    ctaLabel: "Choose your plan →",
    ctaUrl: `${SITE}/plans?promo=${PROMO}`,
  },
];

function cairoDateAt(date: Date, hourCairo: number): Date {
  // Cairo = UTC+3 year-round. Hour 9 Cairo = hour 6 UTC.
  const utcHour = hourCairo - 3;
  const d = new Date(date);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}

async function main() {
  const startArgIdx = process.argv.indexOf("--start");
  const startInput = startArgIdx > -1 ? process.argv[startArgIdx + 1] : null;
  // Default: start tomorrow Cairo morning.
  const todayCairo = new Date();
  // Build "tomorrow midnight Cairo" by going to today's date in UTC and adding 1 day.
  const tomorrow = startInput
    ? new Date(startInput + "T00:00:00.000Z")
    : (() => {
        const t = new Date(todayCairo);
        t.setUTCHours(0, 0, 0, 0);
        t.setUTCDate(t.getUTCDate() + 1);
        return t;
      })();

  console.log(`Seeding 30 scheduled posts starting ${tomorrow.toISOString().slice(0, 10)} Cairo`);

  // Wipe any unsent future entries first to make re-runs idempotent.
  const deleted = await prisma.scheduledBroadcast.deleteMany({
    where: { sent: false, scheduledFor: { gte: new Date() } },
  });
  if (deleted.count > 0) {
    console.log(`Cleared ${deleted.count} prior unsent scheduled rows`);
  }

  const SLOTS = [9, 14, 20]; // Cairo hours
  let inserted = 0;
  for (let day = 0; day < 10; day++) {
    const dayDate = new Date(tomorrow);
    dayDate.setUTCDate(dayDate.getUTCDate() + day);
    for (let slot = 0; slot < 3; slot++) {
      const post = POSTS[day * 3 + slot];
      const scheduledFor = cairoDateAt(dayDate, SLOTS[slot]);
      await prisma.scheduledBroadcast.create({
        data: {
          scheduledFor,
          kind: post.kind,
          text: post.text,
          ctaLabel: post.ctaLabel ?? null,
          ctaUrl: post.ctaUrl ?? null,
        },
      });
      inserted += 1;
      console.log(
        `  ${scheduledFor.toISOString()}  ${post.kind.padEnd(8)}  ${post.text.split("\n")[0].slice(0, 50)}…`
      );
    }
  }
  console.log(`\nDone — ${inserted} posts scheduled.`);
  console.log("View / edit them at https://medexamhub.org/admin/scheduled-broadcasts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
