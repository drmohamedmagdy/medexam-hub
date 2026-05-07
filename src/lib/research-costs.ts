import { chargeCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";
import type { Plan } from "@/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Per-action credit costs for the Research & Statistics suite.
// 1 credit ≈ 1 EGP. Tune these here, no other code changes needed.
// ─────────────────────────────────────────────────────────────────────────────

export const RESEARCH_SECTION_CREDITS = 30;

// Stats analyses + DOCX export + project creation are all local computation.
// They cost no AI tokens, so they're free even for Premium credit-pay-as-you-go.

/**
 * Plans that get full unlimited access to research + statistics. Currently
 * only RESEARCHER — the dedicated plan. Premium uses the credit-pay-as-you-go
 * path (handled by `chargeForResearchSection`).
 */
export const UNLIMITED_RESEARCH_PLANS: Plan[] = ["RESEARCHER"];

/**
 * Plans that have access at all (full or credit-based). Premium gets
 * pay-per-section access, Researcher gets unlimited.
 */
export const RESEARCH_ACCESS_PLANS: Plan[] = ["PREMIUM", "RESEARCHER"];

export function hasUnlimitedResearch(plan: Plan): boolean {
  return UNLIMITED_RESEARCH_PLANS.includes(plan);
}

export function payPerUseResearch(plan: Plan): boolean {
  return plan === "PREMIUM";
}

export function canUseResearch(plan: Plan): boolean {
  return RESEARCH_ACCESS_PLANS.includes(plan);
}

/**
 * Charges a Premium user for one research section generation. No-op for
 * Researcher plan (unlimited). Throws "Insufficient credits" if a Premium
 * user can't afford it — call this AFTER a successful generation so we
 * don't charge for failures.
 */
export async function chargeForResearchSection(args: {
  userId: string;
  plan: Plan;
  projectId: string;
  sectionTitle: string;
}): Promise<{ charged: number }> {
  if (hasUnlimitedResearch(args.plan)) return { charged: 0 };
  if (!payPerUseResearch(args.plan)) {
    // Should be unreachable — gating layer already blocked them.
    throw new Error("This plan can't generate research sections.");
  }
  await chargeCredits({
    userId: args.userId,
    amount: RESEARCH_SECTION_CREDITS,
    type: "research_section_use",
    description: `Research section: ${args.sectionTitle}`,
  });
  return { charged: RESEARCH_SECTION_CREDITS };
}

/**
 * Pre-flight balance check, run BEFORE the expensive Claude API call so
 * we can fail fast without burning tokens. Returns null if OK, an error
 * string otherwise.
 */
export async function preflightResearchSectionCharge(
  userId: string,
  plan: Plan
): Promise<string | null> {
  if (hasUnlimitedResearch(plan)) return null;
  if (!payPerUseResearch(plan)) {
    return "Research is available on the Researcher plan or Premium (pay-per-section).";
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true },
  });
  if (!u) return "User not found.";
  if (u.creditsBalance < RESEARCH_SECTION_CREDITS) {
    return `You need ${RESEARCH_SECTION_CREDITS} credits to generate this section (you have ${u.creditsBalance}). Top up via referrals or upgrade to the Researcher plan for unlimited generations.`;
  }
  return null;
}
