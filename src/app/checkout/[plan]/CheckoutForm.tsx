"use client";

import { useActionState, useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";
import type { Translations } from "@/lib/i18n";
import { applyPromoAction, type PromoApplyState } from "@/app/actions/promo";

type AppliedPromo = {
  code: string;
  finalCents: number;
  originalCents: number;
  discountCents: number;
};

type CheckoutT = Translations["checkout"];

export default function CheckoutForm({
  plan,
  priceMonthly,
  t,
}: {
  plan: Plan;
  priceMonthly: number;
  t: CheckoutT;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoState, promoAction, promoPending] = useActionState<PromoApplyState, FormData>(
    applyPromoAction,
    null
  );

  if (promoState?.ok && (!promo || promo.code !== promoState.code)) {
    setPromo({
      code: promoState.code,
      finalCents: promoState.finalCents,
      originalCents: promoState.originalCents,
      discountCents: promoState.discountCents,
    });
  }

  const finalAmount = promo ? promo.finalCents / 100 : priceMonthly;
  const effectivePromoCode = promo?.code ?? (promoInput.trim() || null);

  async function handlePay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, promoCode: effectivePromoCode }),
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
    <div className="mt-6 space-y-5">
      {/* Promo code */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t.promoApplied.replace("{code}", promo.code)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {t.promoSavings
                  .replace("{save}", (promo.discountCents / 100).toLocaleString())
                  .replace("{total}", (promo.finalCents / 100).toLocaleString())}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPromo(null);
                setPromoInput("");
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {t.promoRemove}
            </button>
          </div>
        ) : (
          <form action={promoAction} id="promo-form" className="space-y-2">
            <label htmlFor="promo-code" className="block text-sm font-medium">
              {t.promoLabel}
            </label>
            <input type="hidden" name="plan" value={plan} />
            <div className="flex gap-2">
              <input
                id="promo-code"
                name="code"
                type="text"
                autoComplete="off"
                placeholder="e.g. OMAR2026"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                onBlur={(e) => {
                  if (e.currentTarget.value.trim().length > 0) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={promoPending}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {promoPending ? t.promoChecking : t.promoApply}
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

      {/* Single Paymob CTA — user picks Card or Wallet on Paymob's page */}
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>💳</span>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Pay with Card or Mobile Wallet
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                Secured by Paymob. You&apos;ll pick Visa / Mastercard or Vodafone
                Cash / Etisalat Cash / Orange Money on the next page, then
                return here automatically once payment completes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
          <span aria-hidden>🔒</span>
          <span>{t.cardSecurity}</span>
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
          {pending ? t.cardRedirecting : t.cardPay.replace("{price}", formatPrice(finalAmount))}
        </button>
      </div>
    </div>
  );
}
