import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import type { Plan } from "@/generated/prisma/client";

// 1 credit ≈ 1 EGP of value. These numbers are intentionally simple round
// figures rather than literal % of price — see the proposal in the conversation
// where 50/100/200 was confirmed.
export const SIGNUP_BONUS_CREDITS: Record<Plan, number> = {
  FREE: 10,
  BASIC: 50,
  PRO: 100,
  PREMIUM: 200,
  RESEARCHER: 300,
};

export const REFERRAL_COMMISSION_CREDITS: Record<Plan, number> = {
  FREE: 0,
  BASIC: 50,
  PRO: 100,
  PREMIUM: 200,
  RESEARCHER: 300,
};

// At checkout, credits can offset at most 50% of the order amount. Stops
// users from grinding referrals into infinite free service.
export const MAX_CREDITS_DISCOUNT_FRACTION = 0.5;

// Bonus quota pricing — credits spent per unit of monthly quota added.
// Top-ups are perpetual: they never expire, drain only on overflow.
export const CREDITS_PER_BONUS_QUESTION = 5;
export const CREDITS_PER_BONUS_FILE = 15;
// Researcher plan top-ups. Pricing reflects the real Claude-token cost
// of generating a full project's sections + the value of the dedicated
// service: 1 EGP = 1 credit, so a single extra project costs 500 EGP.
export const CREDITS_PER_BONUS_RESEARCH_PROJECT = 500;
export const CREDITS_PER_BONUS_STATS_ANALYSIS = 10;

export type CreditTxType =
  | "signup_bonus"
  | "referral_commission"
  | "redemption_discount"
  | "redemption_refund"
  | "redemption_questions"
  | "redemption_files"
  | "redemption_research_projects"
  | "redemption_stats_analyses"
  | "research_section_use"
  | "manual_adjust";

export type BonusKind = "questions" | "files" | "research_projects" | "stats_analyses";

// Codes use 26 letters + digits, omitting visually ambiguous chars
// (0/O/1/I/L). 7 chars × 31 alphabet = ~27 billion — comfortable headroom.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Returns the user's referral code, generating a new unique one if they
 * don't have one yet (older accounts created before this feature shipped
 * already get one via the migration backfill, but this is the safety net).
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (u?.referralCode) return u.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      // P2002 unique violation — try another code.
      continue;
    }
  }
  throw new Error("Could not allocate a unique referral code after 8 attempts");
}

export function getReferralUrl(code: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.PUBLIC_BASE_URL ?? "https://medexamhub.org";
  return `${base.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(code)}`;
}

export async function findUserByReferralCode(code: string) {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return null;
  return prisma.user.findUnique({
    where: { referralCode: normalised },
    select: { id: true, name: true, email: true },
  });
}

/**
 * Credits a user atomically: inserts a CreditTransaction row and bumps
 * the cached balance on User. Always use this — never set creditsBalance
 * directly so the ledger and balance can never drift.
 */
export async function awardCredits(args: {
  userId: string;
  amount: number;
  type: CreditTxType;
  description?: string;
  referredUserId?: string;
  paymentOrderId?: string;
}): Promise<void> {
  if (args.amount <= 0) throw new Error("awardCredits: amount must be positive");
  await prisma.$transaction([
    prisma.creditTransaction.create({
      data: {
        userId: args.userId,
        amount: args.amount,
        type: args.type,
        description: args.description ?? null,
        referredUserId: args.referredUserId ?? null,
        paymentOrderId: args.paymentOrderId ?? null,
      },
    }),
    prisma.user.update({
      where: { id: args.userId },
      data: { creditsBalance: { increment: args.amount } },
    }),
  ]);
}

/**
 * Spends credits (negative-amount ledger row + balance decrement). Throws
 * if the user doesn't have enough — the caller should pre-validate against
 * the user's balance and the per-order cap.
 */
export async function chargeCredits(args: {
  userId: string;
  amount: number;
  type: CreditTxType;
  description?: string;
  paymentOrderId?: string;
}): Promise<void> {
  if (args.amount <= 0) throw new Error("chargeCredits: amount must be positive");

  await prisma.$transaction(async (tx) => {
    // Re-read inside the tx so we don't oversell credits if two flows race.
    const u = await tx.user.findUnique({
      where: { id: args.userId },
      select: { creditsBalance: true },
    });
    if (!u) throw new Error("User not found");
    if (u.creditsBalance < args.amount) {
      throw new Error("Insufficient credits");
    }
    await tx.creditTransaction.create({
      data: {
        userId: args.userId,
        amount: -args.amount,
        type: args.type,
        description: args.description ?? null,
        paymentOrderId: args.paymentOrderId ?? null,
      },
    });
    await tx.user.update({
      where: { id: args.userId },
      data: { creditsBalance: { decrement: args.amount } },
    });
  });
}

/**
 * Awards referral commission to the referrer when a paid order is confirmed.
 * Idempotent: skips if a commission row for this order already exists, or if
 * any earlier paid order from the same referee already triggered a commission
 * (prevents farming via repeated subscriptions of the same referee).
 */
export async function processReferralCommission(orderId: string): Promise<void> {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
    },
  });
  if (!order || order.status !== "PAID") return;

  const referee = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { id: true, name: true, email: true, referredByUserId: true },
  });
  if (!referee?.referredByUserId) return;

  // Already credited for this order?
  const existing = await prisma.creditTransaction.findFirst({
    where: {
      type: "referral_commission",
      paymentOrderId: order.id,
    },
    select: { id: true },
  });
  if (existing) return;

  // Already credited for ANY earlier paid order from this referee?
  // referredUserId on a CreditTransaction stores which user's payment caused it.
  const earlier = await prisma.creditTransaction.findFirst({
    where: {
      type: "referral_commission",
      referredUserId: referee.id,
    },
    select: { id: true },
  });
  if (earlier) return;

  const credits = REFERRAL_COMMISSION_CREDITS[order.plan];
  if (credits <= 0) return;

  const refereeLabel = referee.name?.trim() || referee.email.split("@")[0];
  await awardCredits({
    userId: referee.referredByUserId,
    amount: credits,
    type: "referral_commission",
    description: `Referral: ${refereeLabel} subscribed to ${order.plan}`,
    referredUserId: referee.id,
    paymentOrderId: order.id,
  });

  // Best-effort notification — don't fail the payment activation on this.
  try {
    await createNotification({
      userId: referee.referredByUserId,
      category: "system",
      emoji: "🎁",
      title: `+${credits} credits earned`,
      body: `${refereeLabel} subscribed to ${order.plan} via your referral link. Use credits as a discount on your next plan purchase.`,
      href: "/account/subscription",
    });
  } catch {}
}

export function maxCreditsForOrder(amountCents: number, balance: number): number {
  // 1 credit = 1 EGP off; cap at 50% of the order's full amount.
  const cap = Math.floor((amountCents / 100) * MAX_CREDITS_DISCOUNT_FRACTION);
  return Math.min(balance, cap);
}

/**
 * Spends credits to grant the user extra quota (questions or file uploads).
 * The grant joins a perpetual pool that drains only when the user actually
 * exceeds their plan's monthly quota — so credits never expire. Buy 50
 * questions today, use them next year if you want.
 *
 * Throws on insufficient balance / invalid amount.
 */
const BONUS_UNIT_COST: Record<BonusKind, number> = {
  questions: CREDITS_PER_BONUS_QUESTION,
  files: CREDITS_PER_BONUS_FILE,
  research_projects: CREDITS_PER_BONUS_RESEARCH_PROJECT,
  stats_analyses: CREDITS_PER_BONUS_STATS_ANALYSIS,
};

const BONUS_TX_TYPE: Record<BonusKind, CreditTxType> = {
  questions: "redemption_questions",
  files: "redemption_files",
  research_projects: "redemption_research_projects",
  stats_analyses: "redemption_stats_analyses",
};

const BONUS_LABEL_SINGULAR: Record<BonusKind, string> = {
  questions: "bonus question",
  files: "bonus file upload",
  research_projects: "bonus research project",
  stats_analyses: "bonus statistical analysis",
};

const BONUS_LABEL_PLURAL: Record<BonusKind, string> = {
  questions: "bonus questions",
  files: "bonus file uploads",
  research_projects: "bonus research projects",
  stats_analyses: "bonus statistical analyses",
};

export async function redeemForBonusQuota(args: {
  userId: string;
  kind: BonusKind;
  amount: number;
  yearMonth: string;
}): Promise<void> {
  if (args.amount <= 0) throw new Error("amount must be positive");
  const perUnit = BONUS_UNIT_COST[args.kind];
  const cost = perUnit * args.amount;

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: args.userId },
      select: { creditsBalance: true },
    });
    if (!u) throw new Error("User not found");
    if (u.creditsBalance < cost) throw new Error("Insufficient credits");

    await tx.bonusGrant.create({
      data: {
        userId: args.userId,
        kind: args.kind,
        amount: args.amount,
        creditsSpent: cost,
        yearMonth: args.yearMonth,
      },
    });
    await tx.creditTransaction.create({
      data: {
        userId: args.userId,
        amount: -cost,
        type: BONUS_TX_TYPE[args.kind],
        description: `+${args.amount} ${
          args.amount === 1 ? BONUS_LABEL_SINGULAR[args.kind] : BONUS_LABEL_PLURAL[args.kind]
        }`,
      },
    });
    await tx.user.update({
      where: { id: args.userId },
      data: { creditsBalance: { decrement: cost } },
    });
  });
}

/**
 * Returns the user's available bonus pool for a kind — total granted minus
 * total consumed across all grants ever made.
 */
export async function getBonusBalance(
  userId: string,
  kind: BonusKind
): Promise<number> {
  const grants = await prisma.bonusGrant.findMany({
    where: { userId, kind },
    select: { amount: true, consumed: true },
  });
  return grants.reduce((s, g) => s + (g.amount - g.consumed), 0);
}

/**
 * Drains `amount` units from the user's bonus pool. FIFO — oldest grants
 * are consumed first. Returns the actual amount drained (may be less than
 * requested if the pool is empty).
 */
export async function drainBonus(
  userId: string,
  kind: BonusKind,
  amount: number
): Promise<number> {
  if (amount <= 0) return 0;

  const grants = await prisma.bonusGrant.findMany({
    where: { userId, kind },
    orderBy: { createdAt: "asc" },
  });

  let remaining = amount;
  let drained = 0;

  for (const g of grants) {
    if (remaining <= 0) break;
    const left = g.amount - g.consumed;
    if (left <= 0) continue;
    const take = Math.min(left, remaining);
    await prisma.bonusGrant.update({
      where: { id: g.id },
      data: { consumed: { increment: take } },
    });
    remaining -= take;
    drained += take;
  }

  return drained;
}
