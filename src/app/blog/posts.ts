// Blog post registry. Plain-data table rather than MDX/CMS — fastest
// thing that works. Each post lives as `content` in this file (or in
// /content/blog/<slug>.md if we want to externalise later) and gets
// rendered with the existing markdown helper used by study notes.

export type BlogPost = {
  slug: string;
  title: string;
  metaDescription: string;
  /** Display date — ISO yyyy-mm-dd. */
  date: string;
  /** Author display name. */
  author: string;
  /** 1-2 sentence hook shown on /blog index. */
  excerpt: string;
  /** Tag chips, displayed under title. */
  tags: string[];
  /** Full body as markdown. */
  content: string;
};

export const POSTS: BlogPost[] = [
  {
    slug: "how-to-pass-mrcp-part-1-egypt",
    title: "How to pass MRCP Part 1 from Egypt — a 12-week study plan",
    metaDescription:
      "A practical 12-week MRCP Part 1 study plan tuned for Egyptian doctors: question banks, high-yield specialties, exam-day strategy, and how to use AI question generation.",
    date: "2026-05-13",
    author: "MedExam Hub Editorial",
    excerpt:
      "MRCP Part 1 is heavy on basic sciences and clinical decision-making. Here's how to cover the syllabus in 12 weeks without burning out.",
    tags: ["MRCP", "study plan", "Egypt"],
    content: `## Why MRCP Part 1 trips Egyptian doctors up

MRCP Part 1 is a single best-answer paper of 200 questions across two three-hour sittings. Egyptian medical schools cover the syllabus content, but the exam style — applied clinical decision-making rather than recall — is different from what most residents see during local exams.

Three things usually go wrong:

1. **Underestimating the basic-science weight.** Cardiology, endocrinology, and pharmacology together can account for 40% of the paper. You can't pass without knowing them cold.
2. **Trying to read every textbook.** You don't have time. The exam tests pattern recognition, not encyclopaedic knowledge.
3. **Skipping question banks until the last month.** Reverse this. Question banks ARE the study plan.

## A realistic 12-week plan

### Weeks 1-4: foundation
- Read Pastest *Essentials* or Kalra & Khan, **one specialty per week**. Cardiology, endocrinology, respiratory, GI.
- Do **30 questions per day** from MedExam Hub or Pastest. Mark wrong answers for spaced repetition.
- Aim for one mock test at the end of week 4.

### Weeks 5-8: depth
- Add the smaller specialties: rheumatology, dermatology, nephrology, haematology.
- Bump to **50 questions per day**.
- Every weekend: 100-question timed block. Review wrong answers within 24 hours.

### Weeks 9-11: integration
- Switch to **timed mocks** (180 questions, 3 hours, exam conditions).
- Spaced-repetition review of all mistakes from weeks 1-8 using MedExam Hub's /review.
- Two mocks per week, one fresh + one re-attempt of an old one.

### Week 12: peak
- One full mock 5 days out. Rest the next two days.
- Light review of high-yield topics (electrolytes, ECG patterns, drug side effects).
- Sleep + exam strategy: read every option before choosing, flag uncertain, never leave blank.

## High-yield topics (Egyptian doctors often underweight)

- **ECG interpretation** — every paper has 4-6 ECGs. Drill these.
- **Endocrinology pharmacology** — DPP-4, SGLT2, GLP-1, thiazolidinediones.
- **Genetics short questions** — autosomal dominant/recessive examples.
- **Statistics basics** — sensitivity, specificity, NNT, NNH.

## How MedExam Hub fits in

Generate fresh question batches each week — say "20 cardiology questions, RESIDENT difficulty, MRCP style." Wrong answers automatically flow into the /review queue for spaced-repetition. The /qotd ("question of the day") gives you a daily warmup that keeps your reasoning sharp on weeks you can't sit a full bank.

Free plan covers 20 questions/month — fine to start. Basic (299 EGP/month) gives you 400 questions/month, enough for the first 4 weeks. Pro (699 EGP/month) gives you 1,500 questions/month, which covers weeks 5-12.

## Final tip: don't study alone

Find one or two MRCP study partners in your hospital and meet weekly to discuss tough questions. Explaining a clinical scenario out loud reveals gaps faster than re-reading a textbook.

Good luck — and email us at info@medexamhub.org if you have specific questions about your plan.`,
  },
];

export const POSTS_BY_SLUG: Record<string, BlogPost> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p])
);

export function listPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}
