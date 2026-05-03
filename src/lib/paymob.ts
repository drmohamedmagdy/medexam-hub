import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Plan } from "@/generated/prisma/client";

export const PAYMOB_LINKS: Record<Exclude<Plan, "FREE">, string> = {
  BASIC: "https://paymob.xyz/CVf29Rwq/",
  PRO: "https://paymob.xyz/UrfqyJEg/",
  PREMIUM: "https://paymob.xyz/ebvePVh9/",
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
