import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentLinkFor, newCheckoutToken } from "@/lib/paymob";
import { PLAN_LIMITS } from "@/lib/plans";

const Body = z.object({
  plan: z.enum(["BASIC", "PRO", "PREMIUM"]),
  provider: z.enum(["paymob", "paypal"]).default("paymob"),
});

const CHECKOUT_COOKIE = "mxh_checkout";
const COOKIE_TTL_SEC = 30 * 60;

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse("Invalid request", { status: 400 });

  const { plan, provider } = parsed.data;
  const cfg = PLAN_LIMITS[plan];

  const isPaypal = provider === "paypal";
  const amountCents = isPaypal
    ? Math.round(cfg.priceMonthlyUsd * 100)
    : cfg.priceMonthly * 100;
  const currency = isPaypal ? "USD" : "EGP";

  const order = await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      plan,
      amountCents,
      currency,
    },
  });

  const token = newCheckoutToken(order.id);
  const jar = await cookies();
  jar.set(CHECKOUT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_TTL_SEC,
  });

  // For Paymob we tag the link with merchant_order_id (their hosted page accepts
  // arbitrary query params and propagates them to webhooks). PayPal NCP links
  // don't reliably round-trip query params, so we rely on the signed cookie for
  // matching the post-payment redirect to this PaymentOrder row.
  if (isPaypal) {
    return NextResponse.json({ url: paymentLinkFor("paypal", plan) });
  }

  const linkUrl = new URL(paymentLinkFor("paymob", plan));
  linkUrl.searchParams.set("merchant_order_id", `mxh_${order.id}`);
  return NextResponse.json({ url: linkUrl.toString() });
}
