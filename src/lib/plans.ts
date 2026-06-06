import type { Plan } from "@/generated/prisma/client";

export const CURRENCY = "EGP" as const;

export type PlanLimits = {
  monthlyQuestions: number;
  maxQuestionsPerExam: number;
  fileUploadsPerMonth: number;
  priceMonthly: number;
  originalPriceMonthly?: number;
  label: string;
  description: string;
  badge?: string;
};

// Site-wide promotional discount. Set to 0 to disable.
// Currently disabled — annual / multi-month billing offers the discount
// instead (see BILLING_CYCLES below).
export const PROMO_DISCOUNT_PCT = 0 as const;

// When the promo countdown should hit 00:00:00. Read from env so the team
// can extend the campaign without a redeploy. Falls back to 7 days from
// the deploy time so previews still show a live timer locally.
export function promoEndsAt(): Date {
  const raw = process.env.PROMO_ENDS_AT;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function discount(price: number): number {
  if (PROMO_DISCOUNT_PCT <= 0 || price === 0) return price;
  return Math.round(price * (1 - PROMO_DISCOUNT_PCT / 100));
}

const BASE_PRICES = {
  BASIC: 299,
  PRO: 699,
  PREMIUM: 1099,
  // Researcher plan: bundles unlimited Claude-token cost (5 projects, 25
  // stats analyses, 25 file uploads / month). Top-ups in credits available
  // for users who hit the cap mid-month.
  RESEARCHER: 5000,
} as const;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    monthlyQuestions: 20,
    maxQuestionsPerExam: 10,
    fileUploadsPerMonth: 1,
    priceMonthly: 0,
    label: "Free",
    description: "Try the AI — 2 short exams a month and one file upload.",
  },
  BASIC: {
    monthlyQuestions: 400,
    maxQuestionsPerExam: 20,
    fileUploadsPerMonth: 3,
    priceMonthly: discount(BASE_PRICES.BASIC),
    originalPriceMonthly: PROMO_DISCOUNT_PCT > 0 ? BASE_PRICES.BASIC : undefined,
    label: "Basic",
    description: "For regular practice and medical students.",
    badge: "Most popular",
  },
  PRO: {
    monthlyQuestions: 1500,
    maxQuestionsPerExam: 30,
    fileUploadsPerMonth: 6,
    priceMonthly: discount(BASE_PRICES.PRO),
    originalPriceMonthly: PROMO_DISCOUNT_PCT > 0 ? BASE_PRICES.PRO : undefined,
    label: "Pro",
    description: "For exam candidates who need volume, file uploads, and PDF exports.",
    badge: "Best value",
  },
  PREMIUM: {
    monthlyQuestions: 5000,
    maxQuestionsPerExam: 50,
    fileUploadsPerMonth: 15,
    priceMonthly: discount(BASE_PRICES.PREMIUM),
    originalPriceMonthly: PROMO_DISCOUNT_PCT > 0 ? BASE_PRICES.PREMIUM : undefined,
    label: "Premium",
    description: "For specialists, consultants, and educators — full analytics and PDF exports.",
  },
  RESEARCHER: {
    monthlyQuestions: 500,
    maxQuestionsPerExam: 30,
    fileUploadsPerMonth: 25,
    priceMonthly: discount(BASE_PRICES.RESEARCHER),
    originalPriceMonthly: PROMO_DISCOUNT_PCT > 0 ? BASE_PRICES.RESEARCHER : undefined,
    label: "Researcher",
    description:
      "Dedicated AI Research & Statistics service: protocols, theses, manuscripts, systematic reviews, and 17 statistical tests with Word + PDF export.",
    badge: "Special service",
  },
};

// ─── Temporary FREE-plan question boost ───────────────────────────────
// Time-windowed override: during this UTC window, FREE-plan users see
// monthlyQuestions = FREE_BOOST_QUESTIONS instead of the default 20.
// The window is the campaign run; once it passes the limit reverts
// automatically with no DB cleanup required.
//
// Extended through 15 June 2026 — covers the Arabic Telegram campaign
// plus a follow-up acquisition push. End is exclusive (00:00 UTC on the
// 16th means the boost ends as 15 June ends in Cairo, +3 UTC offset).
// On 2026-06-16 the limit reverts to PLAN_LIMITS.FREE.monthlyQuestions
// automatically; no DB cleanup needed.
//   2026-05-30 00:00 UTC → 2026-06-16 00:00 UTC  (May 30 → Jun 15 inclusive)
const FREE_BOOST_START = new Date("2026-05-30T00:00:00.000Z");
const FREE_BOOST_END = new Date("2026-06-16T00:00:00.000Z");
const FREE_BOOST_QUESTIONS = 100;

export function freeQuotaBoostActive(at: Date = new Date()): boolean {
  return at >= FREE_BOOST_START && at < FREE_BOOST_END;
}

/**
 * Effective monthly question limit for a given plan. Returns the FREE
 * boost value while the temporary campaign window is active, otherwise
 * the static PLAN_LIMITS value. Always call this instead of reading
 * `PLAN_LIMITS[plan].monthlyQuestions` directly in quota code.
 */
export function effectiveMonthlyQuestions(plan: Plan, at: Date = new Date()): number {
  if (plan === "FREE" && freeQuotaBoostActive(at)) return FREE_BOOST_QUESTIONS;
  return PLAN_LIMITS[plan].monthlyQuestions;
}

// Plans that can download a completed exam as a PDF.
export const PDF_EXPORT_PLANS: Plan[] = ["PRO", "PREMIUM"];

export function canExportPdf(plan: Plan): boolean {
  return PDF_EXPORT_PLANS.includes(plan);
}

export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `${amount.toLocaleString("en-US")} ${CURRENCY}`;
}

export function currentYearMonth(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ─── Billing cycles ────────────────────────────────────────────────────
// Users can pay for 1, 3, 6, or 12 months at a time. Longer commitments
// get a percentage discount off the equivalent monthly total. The 1-month
// option is always full price (anchor for showing savings on the others).

export const BILLING_CYCLES = [1, 3, 6, 12] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// Discount applied to the (priceMonthly × months) baseline. Tuned so that:
//   3 mo  ≈ "10% off"
//   6 mo  ≈ "1 month free" (~17%)
//   12 mo ≈ "3 months free" (~25%)
const CYCLE_DISCOUNT_PCT: Record<BillingCycle, number> = {
  1: 0,
  3: 10,
  6: 17,
  12: 25,
};

export function cycleDiscountPct(months: BillingCycle): number {
  return CYCLE_DISCOUNT_PCT[months];
}

export function isBillingCycle(n: unknown): n is BillingCycle {
  return typeof n === "number" && (BILLING_CYCLES as readonly number[]).includes(n);
}

export type CyclePrice = {
  months: BillingCycle;
  /** Full price the user pays in EGP. */
  total: number;
  /** Pre-discount baseline = priceMonthly × months. */
  baseline: number;
  /** Effective per-month cost after discount, rounded to whole EGP. */
  perMonth: number;
  /** Percent saved vs. paying month-to-month (e.g. 17 for 17%). */
  savingsPct: number;
  /** Absolute EGP saved vs. paying month-to-month. */
  savingsAmount: number;
};

/**
 * Compute the cycle price for a plan. Researcher plan is monthly-only at
 * the moment — we still return cycles but callers can choose to hide them.
 */
export function priceForCycle(plan: Plan, months: BillingCycle): CyclePrice {
  const cfg = PLAN_LIMITS[plan];
  const baseline = cfg.priceMonthly * months;
  const pct = CYCLE_DISCOUNT_PCT[months];
  const total = pct > 0 ? Math.round(baseline * (1 - pct / 100)) : baseline;
  const perMonth = Math.round(total / months);
  return {
    months,
    total,
    baseline,
    perMonth,
    savingsPct: pct,
    savingsAmount: baseline - total,
  };
}
