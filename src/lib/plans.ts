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
// When > 0, displayed prices are halved (rounded) and originalPriceMonthly
// is shown with a strikethrough next to the discounted price.
export const PROMO_DISCOUNT_PCT = 50 as const;

function discount(price: number): number {
  if (PROMO_DISCOUNT_PCT <= 0 || price === 0) return price;
  return Math.round(price * (1 - PROMO_DISCOUNT_PCT / 100));
}

const BASE_PRICES = { BASIC: 699, PRO: 1500, PREMIUM: 2500 } as const;

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
};

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
