import { prisma } from "@/lib/db";
import type { Difficulty } from "@/generated/prisma/client";

export type GroupedAccuracy = {
  key: string;
  examCount: number;
  questionCount: number;
  correctCount: number;
  accuracy: number; // 0-100
};

export type AnalyticsSummary = {
  totalExams: number;
  totalCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  overallAccuracy: number | null;
  bySpecialty: GroupedAccuracy[];
  byExamType: GroupedAccuracy[];
  byDifficulty: GroupedAccuracy[];
  byTopic: GroupedAccuracy[];
  recentScores: { id: string; title: string; score: number; submittedAt: Date }[];
};

const MIN_SAMPLE_FOR_RECOMMEND = 2; // need ≥ N exams in a bucket before we trust the average

export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  // We compute accuracy at the QUESTION level (not exam level) so a 30-question
  // exam weighs more than a 5-question exam. We pull the joined rows once and
  // aggregate in memory — at expected user volumes (≤ thousands of questions
  // per user) this is fine and avoids multiple round trips.
  const rows = await prisma.question.findMany({
    where: {
      exam: { userId, status: "COMPLETED" },
    },
    select: {
      isCorrect: true,
      examId: true,
      exam: {
        select: {
          specialty: true,
          examType: true,
          difficulty: true,
          topic: true,
        },
      },
    },
  });

  const recentExams = await prisma.exam.findMany({
    where: { userId, status: "COMPLETED", scorePct: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 10,
    select: { id: true, title: true, scorePct: true, submittedAt: true },
  });

  const totalExamsCount = await prisma.exam.count({ where: { userId } });
  const completedExamIds = new Set(rows.map((r) => r.examId));

  let totalCorrect = 0;
  for (const r of rows) {
    if (r.isCorrect) totalCorrect += 1;
  }
  const totalQ = rows.length;
  const overallAccuracy = totalQ > 0 ? (totalCorrect / totalQ) * 100 : null;

  const bySpecialty = aggregate(rows, (r) => r.exam.specialty);
  const byExamType = aggregate(rows, (r) => r.exam.examType);
  const byDifficulty = aggregate(rows, (r) => r.exam.difficulty);
  const byTopic = aggregate(rows, (r) => r.exam.topic);

  return {
    totalExams: totalExamsCount,
    totalCompleted: completedExamIds.size,
    totalQuestionsAnswered: totalQ,
    totalCorrect,
    overallAccuracy,
    bySpecialty,
    byExamType,
    byDifficulty,
    byTopic,
    recentScores: recentExams
      .filter((e) => e.scorePct !== null && e.submittedAt !== null)
      .map((e) => ({
        id: e.id,
        title: e.title,
        score: Math.round(e.scorePct ?? 0),
        submittedAt: e.submittedAt!,
      })),
  };
}

type Row = {
  isCorrect: boolean | null;
  examId: string;
  exam: { specialty: string | null; examType: string | null; difficulty: Difficulty; topic: string | null };
};

function aggregate(rows: Row[], keyOf: (r: Row) => string | null): GroupedAccuracy[] {
  const map = new Map<string, { exams: Set<string>; correct: number; total: number }>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    if (!map.has(key)) map.set(key, { exams: new Set(), correct: 0, total: 0 });
    const bucket = map.get(key)!;
    bucket.exams.add(r.examId);
    bucket.total += 1;
    if (r.isCorrect) bucket.correct += 1;
  }
  return Array.from(map, ([key, v]) => ({
    key,
    examCount: v.exams.size,
    questionCount: v.total,
    correctCount: v.correct,
    accuracy: v.total === 0 ? 0 : (v.correct / v.total) * 100,
  })).sort((a, b) => b.questionCount - a.questionCount); // most-tested first
}

export function pickWeakAreas(buckets: GroupedAccuracy[], limit = 3): GroupedAccuracy[] {
  return buckets
    .filter((b) => b.examCount >= MIN_SAMPLE_FOR_RECOMMEND)
    .slice() // copy
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

export function pickStrongAreas(buckets: GroupedAccuracy[], limit = 3): GroupedAccuracy[] {
  return buckets
    .filter((b) => b.examCount >= MIN_SAMPLE_FOR_RECOMMEND)
    .slice()
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, limit);
}
