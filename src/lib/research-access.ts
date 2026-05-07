import type { Plan } from "@/generated/prisma/client";
import {
  RESEARCH_ACCESS_PLANS,
  RESEARCH_SECTION_CREDITS,
  hasUnlimitedResearch,
  payPerUseResearch,
} from "@/lib/research-costs";

// Plans that can access /research and /statistics. Premium pays credits
// per AI section; Researcher gets unlimited usage.
export const RESEARCH_PLANS: Plan[] = RESEARCH_ACCESS_PLANS;

export function canUseResearch(plan: Plan): boolean {
  return RESEARCH_PLANS.includes(plan);
}

/**
 * Human-friendly summary of *how* this plan can use research.
 * Used in upgrade prompts and the editor sidebar.
 */
export function researchAccessHint(plan: Plan): {
  hasAccess: boolean;
  unlimited: boolean;
  payPerUse: boolean;
  perSectionCredits: number;
  message: string;
} {
  if (hasUnlimitedResearch(plan)) {
    return {
      hasAccess: true,
      unlimited: true,
      payPerUse: false,
      perSectionCredits: 0,
      message: "Researcher plan: unlimited section generation.",
    };
  }
  return {
    hasAccess: false,
    unlimited: false,
    payPerUse: false,
    perSectionCredits: RESEARCH_SECTION_CREDITS,
    message:
      "Research & Statistics is a dedicated service — upgrade to the Researcher plan to generate sections and run analyses.",
  };
}

export const UPGRADE_REQUIRED_PREFIX = "[UPGRADE_REQUIRED] ";

export function upgradeRequiredError(): string {
  return `${UPGRADE_REQUIRED_PREFIX}Upgrade to the Researcher plan to use this feature.`;
}
