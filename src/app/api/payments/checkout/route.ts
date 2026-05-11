import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PAYMOB_LINKS, newCheckoutToken } from "@/lib/paymob";
import { createPaymentIntention, isPaymobConfigured } from "@/lib/paymob-intention";
import { PLAN_LIMITS } from "@/lib/plans";
import { validatePromoCode } from "@/lib/promo";

const Body = z.object({
  plan: z.enum(["BASIC", "PRO", "PREMIUM", "RESEARCHER"]),
  promoCode: z.string().max(40).nullable().optional(),
});

const CHECKOUT_COOKIE = "mxh_checkout";
const COOKIE_TTL_SEC = 30 * 60;

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse("Invalid request", { status: 400 });

  const { plan, promoCode } = parsed.data;
  const cfg = PLAN_LIMITS[plan];
  const originalCents = cfg.priceMonthly * 100;

  // Re-validate the promo on the server. NEVER trust the client's claimed price.
  let amountCents = originalCents;
  let promoId: string | null = null;
  let promoLinkOverride: string | null = null;
  let promoCodeStored: string | null = null;

  if (promoCode && promoCode.trim()) {
    const validation = await validatePromoCode({
      code: promoCode,
      plan,
      userId: user.id,
    });
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }
    amountCents = validation.finalCents;
    promoId = validation.promoId;
    promoLinkOverride = validation.paymobLinkOverride;
    promoCodeStored = validation.code;
  }

  const order = await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      plan,
      amountCents,
      currency: "EGP",
      promoCodeId: promoId,
      promoCodeUsed: promoCodeStored,
      originalCents: promoId ? originalCents : null,
    },
  });

  // Record the redemption immediately on order creation (linked to the order so we
  // can correlate later when payment confirms via Paymob webhook / return).
  if (promoId) {
    await prisma.promoRedemption.create({
      data: {
        promoCodeId: promoId,
        userId: user.id,
        plan,
        originalCents,
        finalCents: amountCents,
        paymentOrderId: order.id,
      },
    });
  }

  const token = newCheckoutToken(order.id);
  const jar = await cookies();
  jar.set(CHECKOUT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_TTL_SEC,
  });

  // NEW PATH: Intention API. When the Paymob secret/public/HMAC env vars
  // are configured we build an intention and redirect the user to the
  // unified-checkout page. The webhook (POST /api/payments/paymob/webhook)
  // marks the order PAID on success.
  if (isPaymobConfigured()) {
    const baseUrl =
      process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://medexamhub.org";
    try {
      const firstName = user.name?.split(/\s+/)[0] || "MedExam";
      const lastName = user.name?.split(/\s+/).slice(1).join(" ") || "User";
      const intention = await createPaymentIntention({
        amountCents,
        currency: "EGP",
        // Surface both Card and Wallet (which covers Instapay) on the
        // unified checkout — let the customer pick on Paymob's side.
        methods: ["card", "wallet"],
        description: `${cfg.label} plan — MedExam Hub`,
        externalOrderId: order.id,
        billing: { firstName, lastName, email: user.email },
        redirectUrl: `${baseUrl}/payment/return`,
      });
      return NextResponse.json({ url: intention.checkoutUrl });
    } catch (e) {
      // If intention creation fails (mis-config, network), fall through
      // to the legacy short-link below rather than blocking the user.
      console.error("[checkout] paymob intention failed; falling back", e);
    }
  }

  // LEGACY PATH: pre-configured Paymob short-links.
  // Use the promo's override Paymob link if provided (per-promo discounted prices),
  // otherwise fall back to the default link for the plan.
  const baseLink = promoLinkOverride ?? PAYMOB_LINKS[plan];

  // Guard: a placeholder URL means the operator hasn't created the Paymob
  // payment link for this plan yet (e.g. RESEARCHER on first deploy).
  // Tell the client to use manual payment instead of redirecting them
  // into a Paymob 404.
  if (baseLink.includes("CHANGE_ME_")) {
    return NextResponse.json(
      {
        error:
          "Card payment isn't available for this plan yet — please use Vodafone Cash or InstaPay below.",
      },
      { status: 503 }
    );
  }

  const linkUrl = new URL(baseLink);
  linkUrl.searchParams.set("merchant_order_id", `mxh_${order.id}`);

  return NextResponse.json({ url: linkUrl.toString() });
}
