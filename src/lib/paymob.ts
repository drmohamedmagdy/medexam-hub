import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Plan } from "@/generated/prisma/client";

// 50%-OFF promo links — charge Basic 350, Pro 750, Premium 1250 EGP.
// These are active by default while PROMO_DISCOUNT_PCT === 50 in src/lib/plans.ts.
// To end the promo: revert PROMO_DISCOUNT_PCT to 0 AND swap PAYMOB_LINKS back
// to LEGACY_PAYMOB_LINKS_FULL_PRICE below.
export const PAYMOB_LINKS: Record<Exclude<Plan, "FREE">, string> = {
  BASIC: "https://paymob.xyz/F7bYDEct/",
  PRO: "https://paymob.xyz/NrzwHqtz/",
  PREMIUM: "https://paymob.xyz/60HF1rQy/",
  // Placeholder — create a Paymob payment link for 749 EGP and paste the URL
  // here. Until then, manual / Vodafone-Cash flow is the only way to buy.
  RESEARCHER: "https://paymob.xyz/CHANGE_ME_RESEARCHER/",
};

// Original full-price links — kept here so the 50% promo can be reverted by
// swapping these into PAYMOB_LINKS.
export const LEGACY_PAYMOB_LINKS_FULL_PRICE: Record<Exclude<Plan, "FREE">, string> = {
  BASIC: "https://paymob.xyz/CVf29Rwq/",
  PRO: "https://paymob.xyz/UrfqyJEg/",
  PREMIUM: "https://paymob.xyz/ebvePVh9/",
  RESEARCHER: "https://paymob.xyz/CHANGE_ME_RESEARCHER_FULL/",
};

const TOKEN_TTL_MS = 30 * 60 * 1000;

function getSecret(): string {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET env var is required in production");
  }
  return "dev-only-app-secret-replace-me-please";
}

export type CheckoutToken = {
  orderId: string;
  exp: number;
};

export function signCheckoutToken(payload: CheckoutToken): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyCheckoutToken(token: string): CheckoutToken | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: CheckoutToken;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CheckoutToken;
  } catch {
    return null;
  }
  if (typeof parsed.orderId !== "string" || typeof parsed.exp !== "number") return null;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

export function newCheckoutToken(orderId: string): string {
  return signCheckoutToken({ orderId, exp: Date.now() + TOKEN_TTL_MS });
}

export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}
