import type { Plan } from "@/generated/prisma/client";

export const CURRENCY = "EGP" as const;

export type PlanLimits = {
  monthlyQuestions: number;
  maxQuestionsPerExam: number;
  fileUploadsPerMonth: number;
  priceMonthly: number;
  label: string;
  description: string;
  badge?: string;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    monthlyQuestions: 10,
    maxQuestionsPerExam: 10,
    fileUploadsPerMonth: 0,
    priceMonthly: 0,
    label: "Free",
    description: "10 trial questions a month — get a feel for the AI before upgrading.",
  },
  BASIC: {
    monthlyQuestions: 375,
    maxQuestionsPerExam: 25,
    fileUploadsPerMonth: 0,
    priceMonthly: 699,
    label: "Basic",
    description: "For regular practice and medical students.",
    badge: "Most popular",
  },
  PRO: {
    monthlyQuestions: 1500,
    maxQuestionsPerExam: 30,
    fileUploadsPerMonth: 2,
    priceMonthly: 1500,
    label: "Pro",
    description: "For exam candidates who need volume and file-based questions.",
    badge: "Best value",
  },
  PREMIUM: {
    monthlyQuestions: 4000,
    maxQuestionsPerExam: 40,
    fileUploadsPerMonth: 10,
    priceMonthly: 2500,
    label: "Premium",
    description: "For specialists, consultants, and educators.",
  },
};

export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `${amount.toLocaleString("en-US")} ${CURRENCY}`;
}

export function currentYearMonth(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
