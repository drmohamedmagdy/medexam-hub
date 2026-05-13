import type { Plan, PromoCode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";

export type PromoErrorCode =
  | "EMPTY"
  | "NOT_FOUND"
  | "DISABLED"
  | "EXPIRED"
  | "WRONG_PLAN"
  | "MAX_USES"
  | "USER_MAX_USES"
  | "INVALID_CONFIG";

export type PromoValidation =
  | {
      ok: true;
      code: string;
      promoId: string;
      plan: Exclude<Plan, "FREE">;
      originalCents: number;
      finalCents: number;
      discountCents: number;
      paymobLinkOverride: string | null;
    }
  | {
      ok: false;
      error: PromoErrorCode;
      message: string;
    };

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}

export function parseApplicablePlans(json: string): Array<Exclude<Plan, "FREE">> {
  if (!json || json === "ALL") return ["BASIC", "PRO", "PREMIUM"];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return ["BASIC", "PRO", "PREMIUM"];
    return parsed.filter((p): p is Exclude<Plan, "FREE"> =>
      p === "BASIC" || p === "PRO" || p === "PREMIUM"
    );
  } catch {
    return ["BASIC", "PRO", "PREMIUM"];
  }
}

export function parsePaymobLinks(
  json: string | null
): Partial<Record<Exclude<Plan, "FREE">, string>> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Partial<Record<string, unknown>>;
    const out: Partial<Record<Exclude<Plan, "FREE">, string>> = {};
    for (const k of ["BASIC", "PRO", "PREMIUM"] as const) {
      const v = parsed[k];
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function calculateFinalCents(
  promo: Pick<PromoCode, "discountType" | "discountValue">,
  originalCents: number
): number {
  if (promo.discountType === "PERCENT") {
    const pct = Math.max(0, Math.min(100, promo.discountValue));
    return Math.max(0, Math.round(originalCents * (1 - pct / 100)));
  }
  // FIXED: discountValue is in EGP (not cents) for admin convenience
  const fixedCents = promo.discountValue * 100;
  return Math.max(0, originalCents - fixedCents);
}

const ERR_MESSAGES: Record<PromoErrorCode, string> = {
  EMPTY: "Enter a promo code.",
  NOT_FOUND: "This promo code doesn't exist.",
  DISABLED: "This promo code is no longer active.",
  EXPIRED: "This promo code has expired.",
  WRONG_PLAN: "This promo code doesn't apply to the selected plan.",
  MAX_USES: "This promo code has reached its usage limit.",
  USER_MAX_USES: "You've already used this promo code the maximum number of times.",
  INVALID_CONFIG: "This promo code is misconfigured. Contact support.",
};

export async function validatePromoCode(args: {
  code: string;
  plan: Exclude<Plan, "FREE">;
  userId: string;
  /**
   * Override the price the promo discounts. Defaults to the plan's monthly
   * price × 100, but multi-month checkouts pass the cycle total so the
   * promo applies to the full bundle. The applicability rules (plan
   * whitelist, usage caps) are unchanged.
   */
  baseCents?: number;
}): Promise<PromoValidation> {
  const normalized = normalizeCode(args.code);
  if (!normalized) {
    return { ok: false, error: "EMPTY", message: ERR_MESSAGES.EMPTY };
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code: normalized },
  });
  if (!promo) {
    return { ok: false, error: "NOT_FOUND", message: ERR_MESSAGES.NOT_FOUND };
  }
  if (!promo.isActive) {
    return { ok: false, error: "DISABLED", message: ERR_MESSAGES.DISABLED };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { ok: false, error: "EXPIRED", message: ERR_MESSAGES.EXPIRED };
  }

  const allowedPlans = parseApplicablePlans(promo.applicablePlans);
  if (!allowedPlans.includes(args.plan)) {
    return { ok: false, error: "WRONG_PLAN", message: ERR_MESSAGES.WRONG_PLAN };
  }

  // Total uses
  if (promo.maxUses !== null) {
    const used = await prisma.promoRedemption.count({
      where: { promoCodeId: promo.id },
    });
    if (used >= promo.maxUses) {
      return { ok: false, error: "MAX_USES", message: ERR_MESSAGES.MAX_USES };
    }
  }

  // Per-user uses
  if (promo.maxUsesPerUser > 0) {
    const userUsed = await prisma.promoRedemption.count({
      where: { promoCodeId: promo.id, userId: args.userId },
    });
    if (userUsed >= promo.maxUsesPerUser) {
      return {
        ok: false,
        error: "USER_MAX_USES",
        message: ERR_MESSAGES.USER_MAX_USES,
      };
    }
  }

  const cfg = PLAN_LIMITS[args.plan];
  const originalCents = args.baseCents ?? cfg.priceMonthly * 100;
  const finalCents = calculateFinalCents(promo, originalCents);

  if (finalCents < 0 || originalCents <= 0) {
    return {
      ok: false,
      error: "INVALID_CONFIG",
      message: ERR_MESSAGES.INVALID_CONFIG,
    };
  }

  const links = parsePaymobLinks(promo.paymobLinks);
  return {
    ok: true,
    code: promo.code,
    promoId: promo.id,
    plan: args.plan,
    originalCents,
    finalCents,
    discountCents: originalCents - finalCents,
    paymobLinkOverride: links[args.plan] ?? null,
  };
}

export function describePromoDiscount(
  promo: Pick<PromoCode, "discountType" | "discountValue">
): string {
  if (promo.discountType === "PERCENT") {
    return `${promo.discountValue}% off`;
  }
  return `${promo.discountValue} EGP off`;
}
