import type { Plan } from "@/generated/prisma/client";

// Phase 1: gated to Pro and Premium so Free / Basic users see an upgrade
// prompt rather than running heavy compute on the cheap tiers.
export const RESEARCH_PLANS: Plan[] = ["PRO", "PREMIUM"];

export function canUseResearch(plan: Plan): boolean {
  return RESEARCH_PLANS.includes(plan);
}
