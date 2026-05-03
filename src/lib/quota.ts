import { prisma } from "@/lib/db";
import { PLAN_LIMITS, currentYearMonth } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

const KIND = "exam_created";

export type QuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
};

export async function getMonthlyExamUsage(userId: string, plan: Plan): Promise<QuotaStatus> {
  const limit = PLAN_LIMITS[plan].monthlyExams;
  const ym = currentYearMonth();

  const agg = await prisma.usageLog.aggregate({
    where: { userId, kind: KIND, yearMonth: ym },
    _sum: { count: true },
  });
  const used = agg._sum.count ?? 0;

  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function recordExamCreated(userId: string): Promise<void> {
  await prisma.usageLog.create({
    data: {
      userId,
      kind: KIND,
      count: 1,
      yearMonth: currentYearMonth(),
    },
  });
}
