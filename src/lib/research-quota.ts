import "server-only";
import { prisma } from "@/lib/db";
import { drainBonus, getBonusBalance } from "@/lib/credits";
import {
  RESEARCHER_MONTHLY_PROJECTS,
  RESEARCHER_MONTHLY_STATS_ANALYSES,
} from "@/lib/research-costs";
import type { Plan } from "@/generated/prisma/client";

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export type ResearchQuotaStatus = {
  used: number;
  planLimit: number;
  bonus: number;
  limit: number;
  remaining: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Research projects (RESEARCHER plan only — Premium has no project quota,
// they pay credits per section instead).
// ─────────────────────────────────────────────────────────────────────────────

export async function getMonthlyResearchProjects(
  userId: string,
  plan: Plan
): Promise<ResearchQuotaStatus> {
  const planLimit = plan === "RESEARCHER" ? RESEARCHER_MONTHLY_PROJECTS : 0;
  const since = startOfCurrentMonth();
  const [used, bonus] = await Promise.all([
    prisma.researchProject.count({ where: { userId, createdAt: { gte: since } } }),
    getBonusBalance(userId, "research_projects"),
  ]);
  const limit = planLimit + bonus;
  return { used, planLimit, bonus, limit, remaining: Math.max(0, limit - used) };
}

/**
 * Drains one project from the bonus pool if this user's *new* project
 * pushes them past their monthly plan cap. No-op for non-Researcher plans.
 * Call AFTER `prisma.researchProject.create()`.
 */
export async function recordResearchProjectCreated(
  userId: string,
  plan: Plan
): Promise<void> {
  if (plan !== "RESEARCHER") return;
  const since = startOfCurrentMonth();
  const used = await prisma.researchProject.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (used > RESEARCHER_MONTHLY_PROJECTS) {
    await drainBonus(userId, "research_projects", 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats analyses (RESEARCHER plan only — Premium gets stats free, no quota).
// "Stats analyses" combines the in-research and standalone-statistics tools.
// ─────────────────────────────────────────────────────────────────────────────

export async function getMonthlyStatsAnalyses(
  userId: string,
  plan: Plan
): Promise<ResearchQuotaStatus> {
  const planLimit = plan === "RESEARCHER" ? RESEARCHER_MONTHLY_STATS_ANALYSES : 0;
  const since = startOfCurrentMonth();
  const [inProject, standalone, bonus] = await Promise.all([
    prisma.researchAnalysis.count({
      where: {
        project: { userId },
        createdAt: { gte: since },
      },
    }),
    prisma.statsAnalysis.count({
      where: {
        workspace: { userId },
        createdAt: { gte: since },
      },
    }),
    getBonusBalance(userId, "stats_analyses"),
  ]);
  const used = inProject + standalone;
  const limit = planLimit + bonus;
  return { used, planLimit, bonus, limit, remaining: Math.max(0, limit - used) };
}

/**
 * Drains one analysis from the bonus pool if this user's *new* analysis
 * pushes them past their monthly plan cap. No-op for non-Researcher plans.
 * Call AFTER the analysis row is created.
 */
export async function recordStatsAnalysisRun(userId: string, plan: Plan): Promise<void> {
  if (plan !== "RESEARCHER") return;
  const status = await getMonthlyStatsAnalyses(userId, plan);
  // After the create, `used` already reflects the new row. If used now
  // exceeds the plan cap (and there's bonus), drain 1.
  if (status.used > RESEARCHER_MONTHLY_STATS_ANALYSES && status.bonus > 0) {
    await drainBonus(userId, "stats_analyses", 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-flight checks — call before the work starts so we can reject cleanly
// without creating orphan rows or burning tokens.
// ─────────────────────────────────────────────────────────────────────────────

export async function preflightCreateResearchProject(
  userId: string,
  plan: Plan
): Promise<string | null> {
  if (plan !== "RESEARCHER") return null; // Premium has no project quota
  const status = await getMonthlyResearchProjects(userId, plan);
  if (status.remaining < 1) {
    return `You've used all ${status.planLimit} research projects this month on the Researcher plan${
      status.bonus > 0 ? `, and your bonus pool is empty` : ""
    }. Buy more in the Credits page or wait for next month.`;
  }
  return null;
}

export async function preflightStatsAnalysis(
  userId: string,
  plan: Plan
): Promise<string | null> {
  if (plan !== "RESEARCHER") return null; // Premium has no stats quota
  const status = await getMonthlyStatsAnalyses(userId, plan);
  if (status.remaining < 1) {
    return `You've used all ${status.planLimit} statistical analyses this month on the Researcher plan${
      status.bonus > 0 ? `, and your bonus pool is empty` : ""
    }. Buy more in the Credits page or wait for next month.`;
  }
  return null;
}
