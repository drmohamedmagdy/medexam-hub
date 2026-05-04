"use client";

import { useActionState, useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";
import { applyPromoAction, type PromoApplyState } from "@/app/actions/promo";

type AppliedPromo = {
  code: string;
  finalCents: number;
  originalCents: number;
  discountCents: number;
};

export default function CheckoutForm({
  plan,
  priceMonthly,
}: {
  plan: Plan;
  priceMonthly: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoState, promoAction, promoPending] = useActionState<PromoApplyState, FormData>(
    applyPromoAction,
    null
  );

  // When the server action returns a successful validation, capture it locally
  // so the user sees a "promo applied" state until they remove it.
  if (promoState?.ok && (!promo || promo.code !== promoState.code)) {
    setPromo({
      code: promoState.code,
      finalCents: promoState.finalCents,
      originalCents: promoState.originalCents,
      discountCents: promoState.discountCents,
    });
  }

  const finalAmount = promo ? promo.finalCents / 100 : priceMonthly;

  async function handlePay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          promoCode: promo?.code ?? null,
        }),
      });
      if (!res.ok) {
        setError(`Couldn't start checkout: ${await res.text()}`);
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) {
        setError(data.error ?? "No checkout URL returned");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You&apos;ll be redirected to Paymob to enter your card details. After successful payment,
        return to this site to activate your plan.
      </p>

      {/* Promo code section */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                ✓ Promo &quot;{promo.code}&quot; applied
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                You save {(promo.discountCents / 100).toLocaleString()} EGP — new total{" "}
                {(promo.finalCents / 100).toLocaleString()} EGP/month
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPromo(null)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <form action={promoAction} className="space-y-2">
            <label htmlFor="promo-code" className="block text-sm font-medium">
              Have a promo code?
            </label>
            <input type="hidden" name="plan" value={plan} />
            <div className="flex gap-2">
              <input
                id="promo-code"
                name="code"
                type="text"
                autoComplete="off"
                placeholder="e.g. OMAR2026"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={promoPending}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {promoPending ? "Checking…" : "Apply"}
              </button>
            </div>
            {promoState && !promoState.ok && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {promoState.error}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
        <span aria-hidden>🔒</span>
        <span>Payments processed by Paymob. We never see your card number.</span>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {pending ? "Redirecting to Paymob…" : `Pay ${formatPrice(finalAmount)} with Paymob`}
      </button>
    </div>
  );
}
