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
  if (payPerUseResearch(plan)) {
    return {
      hasAccess: true,
      unlimited: false,
      payPerUse: true,
      perSectionCredits: RESEARCH_SECTION_CREDITS,
      message: `Premium pay-per-use: ${RESEARCH_SECTION_CREDITS} credits per section.`,
    };
  }
  return {
    hasAccess: false,
    unlimited: false,
    payPerUse: false,
    perSectionCredits: RESEARCH_SECTION_CREDITS,
    message:
      "Research is on the Researcher plan (unlimited) or Premium (pay-per-section in credits).",
  };
}
