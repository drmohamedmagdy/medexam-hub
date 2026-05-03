import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PAYMOB_LINKS, newCheckoutToken } from "@/lib/paymob";
import { PLAN_LIMITS } from "@/lib/plans";

const Body = z.object({
  plan: z.enum(["BASIC", "PRO", "PREMIUM"]),
});

const CHECKOUT_COOKIE = "mxh_checkout";
const COOKIE_TTL_SEC = 30 * 60;

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse("Invalid request", { status: 400 });

  const { plan } = parsed.data;
  const cfg = PLAN_LIMITS[plan];

  const order = await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      plan,
      amountCents: cfg.priceMonthly * 100,
      currency: "EGP",
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

  // Append unique merchant_order_id so the transaction is traceable in Paymob's
  // dashboard and any future webhook can match it back to our PaymentOrder row.
  const linkUrl = new URL(PAYMOB_LINKS[plan]);
  linkUrl.searchParams.set("merchant_order_id", `mxh_${order.id}`);

  return NextResponse.json({ url: linkUrl.toString() });
}
