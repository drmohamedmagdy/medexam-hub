import type { Plan } from "@/generated/prisma/client";

export const CURRENCY = "EGP" as const;

export type PlanLimits = {
  monthlyExams: number;
  maxQuestionsPerExam: number;
  fileUploadsPerMonth: number;
  priceMonthly: number;
  label: string;
  description: string;
  badge?: string;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    monthlyExams: 1,
    maxQuestionsPerExam: 10,
    fileUploadsPerMonth: 0,
    priceMonthly: 0,
    label: "Free",
    description: "A 1-exam trial each month — get a feel for the AI before upgrading.",
  },
  BASIC: {
    monthlyExams: 15,
    maxQuestionsPerExam: 25,
    fileUploadsPerMonth: 0,
    priceMonthly: 699,
    label: "Basic",
    description: "For regular practice and medical students.",
    badge: "Most popular",
  },
  PRO: {
    monthlyExams: 50,
    maxQuestionsPerExam: 30,
    fileUploadsPerMonth: 2,
    priceMonthly: 1500,
    label: "Pro",
    description: "For exam candidates who need volume and file-based questions.",
    badge: "Best value",
  },
  PREMIUM: {
    monthlyExams: 100,
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
