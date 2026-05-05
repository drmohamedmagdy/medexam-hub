import { prisma } from "@/lib/db";
import type { Plan } from "@/generated/prisma/client";

/**
 * Daily question target by plan tier — matches the rough "use roughly 1/30
 * of your monthly quota each day to fully utilize your plan" heuristic.
 */
const DAILY_GOAL_BY_PLAN: Record<Plan, number> = {
  FREE: 5,
  BASIC: 15,
  PRO: 50,
  PREMIUM: 100,
};

export function getDailyGoal(plan: Plan): number {
  return DAILY_GOAL_BY_PLAN[plan];
}

/**
 * Count of questions the user has answered today (UTC) — used to render a
 * "X / Y questions today" progress bar on the dashboard.
 */
export async function getQuestionsAnsweredToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const count = await prisma.question.count({
    where: {
      exam: {
        userId,
        status: "COMPLETED",
        submittedAt: { gte: startOfDay },
      },
    },
  });
  return count;
}

/**
 * Count of consecutive days (UTC) the user has completed at least one exam,
 * counting backwards from today. Returns 0 if the most-recent submission was
 * before yesterday — i.e. they "broke" the streak.
 *
 * Used to surface a "🔥 X-day study streak" badge on the dashboard, giving
 * users a small daily-return incentive without being annoying.
 */
export async function getStudyStreak(userId: string): Promise<number> {
  const exams = await prisma.exam.findMany({
    where: { userId, status: "COMPLETED", submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 90, // 90 days back is more than enough to compute any reasonable streak
    select: { submittedAt: true },
  });

  if (exams.length === 0) return 0;

  // Collapse to unique day strings (YYYY-MM-DD in UTC)
  const days = new Set<string>();
  for (const e of exams) {
    if (e.submittedAt) days.add(e.submittedAt.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;

  // Walk backwards from today (or yesterday — we accept yesterday so a streak
  // doesn't break the morning before the user has a chance to study)
  const sorted = Array.from(days).sort().reverse();
  const todayISO = new Date().toISOString().slice(0, 10);
  const yesterdayISO = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (sorted[0] !== todayISO && sorted[0] !== yesterdayISO) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    prev.setUTCDate(prev.getUTCDate() - 1);
    const expected = prev.toISOString().slice(0, 10);
    if (sorted[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
