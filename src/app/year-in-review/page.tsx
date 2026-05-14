import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ShareCard from "./ShareCard";

// Personalised "your year on MedExam Hub" page. Spotify-Wrapped energy
// for medical students. Shows their study stats for the calendar year,
// laid out as a shareable card. Drives viral discovery — every doctor
// posts these on LinkedIn / Instagram in December.
//
// Designed so the same page works year-round (not just December): you
// can drop in via /year-in-review?year=2025 if needed. Defaults to the
// current calendar year.

export const metadata = { title: "Your year on MedExam Hub" };

export default async function YearInReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const queryYear = Number.parseInt(sp.year ?? "", 10);
  const year =
    queryYear >= 2025 && queryYear <= new Date().getFullYear() + 1
      ? queryYear
      : new Date().getFullYear();

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // Fetch everything we need in parallel — keeps the page snappy even
  // for power users with thousands of questions.
  const [
    exams,
    completedExams,
    reviewCardsCleared,
    examQuestions,
    mockExams,
    notes,
  ] = await Promise.all([
    prisma.exam.findMany({
      where: { userId: user.id, createdAt: { gte: yearStart, lt: yearEnd } },
      select: {
        id: true,
        status: true,
        specialty: true,
        scorePct: true,
        numQuestions: true,
        createdAt: true,
      },
    }),
    prisma.exam.count({
      where: {
        userId: user.id,
        status: "COMPLETED",
        submittedAt: { gte: yearStart, lt: yearEnd },
      },
    }),
    prisma.reviewCard.count({
      where: {
        userId: user.id,
        lastReviewedAt: { gte: yearStart, lt: yearEnd },
      },
    }),
    prisma.question.count({
      where: {
        exam: { userId: user.id, createdAt: { gte: yearStart, lt: yearEnd } },
        isCorrect: { not: null },
      },
    }),
    prisma.mockExam.count({
      where: {
        userId: user.id,
        status: "completed",
        completedAt: { gte: yearStart, lt: yearEnd },
      },
    }),
    prisma.studyNote.count({
      where: { userId: user.id, createdAt: { gte: yearStart, lt: yearEnd } },
    }),
  ]);

  // Specialty leaderboard for the user — strongest specialty by avg score.
  const bySpec = new Map<string, { sum: number; count: number; questions: number }>();
  for (const e of exams) {
    if (e.status !== "COMPLETED" || e.scorePct === null) continue;
    const key = e.specialty?.trim() || "Mixed";
    const cur = bySpec.get(key) ?? { sum: 0, count: 0, questions: 0 };
    cur.sum += e.scorePct;
    cur.count += 1;
    cur.questions += e.numQuestions;
    bySpec.set(key, cur);
  }
  const specRanked = [...bySpec.entries()]
    .map(([k, v]) => ({ specialty: k, avg: Math.round(v.sum / v.count), questions: v.questions }))
    .sort((a, b) => b.avg - a.avg);
  const topSpecialty = specRanked[0] ?? null;
  const topSpecialtyByVolume = [...bySpec.entries()]
    .map(([k, v]) => ({ specialty: k, questions: v.questions }))
    .sort((a, b) => b.questions - a.questions)[0] ?? null;

  // Overall stats for the hero numbers.
  const scoredExams = exams.filter((e) => e.status === "COMPLETED" && e.scorePct !== null);
  const avgScore =
    scoredExams.length === 0
      ? null
      : Math.round(scoredExams.reduce((s, e) => s + (e.scorePct ?? 0), 0) / scoredExams.length);

  // "Most active month" — bucket exams by month and find the peak.
  const monthBuckets = new Array(12).fill(0) as number[];
  for (const e of exams) {
    monthBuckets[e.createdAt.getMonth()] += 1;
  }
  const peakMonthIdx = monthBuckets.indexOf(Math.max(...monthBuckets));
  const peakMonth =
    monthBuckets[peakMonthIdx] > 0
      ? new Date(year, peakMonthIdx, 1).toLocaleString("en-GB", { month: "long" })
      : null;

  const recipientName = user.name?.trim() || user.email.split("@")[0];

  return (
    <ShareCard
      year={year}
      recipientName={recipientName}
      stats={{
        examsCreated: exams.length,
        examsCompleted: completedExams,
        mockExams,
        questions: examQuestions,
        reviewCardsCleared,
        notes,
        avgScore,
        topSpecialty: topSpecialty
          ? { name: topSpecialty.specialty, avgScore: topSpecialty.avg }
          : null,
        topSpecialtyByVolume: topSpecialtyByVolume?.specialty ?? null,
        peakMonth,
        specialtiesCovered: bySpec.size,
      }}
    />
  );
}
