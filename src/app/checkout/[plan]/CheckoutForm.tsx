"use client";

import { useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";

export default function CheckoutForm({
  plan,
  priceMonthly,
  priceMonthlyUsd,
}: {
  plan: Plan;
  priceMonthly: number;
  priceMonthlyUsd: number;
}) {
  const [pending, setPending] = useState<"paymob" | "paypal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(provider: "paymob" | "paypal") {
    setPending(provider);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, provider }),
      });
      if (!res.ok) {
        setError(`Couldn't start checkout: ${await res.text()}`);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setError("No checkout URL returned");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(null);
    }
  }

  const usdLabel = `$${priceMonthlyUsd.toFixed(2)}`;

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pick a payment method. You&apos;ll be redirected to enter your card details. After successful payment, return to this site to activate your plan.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handlePay("paymob")}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <span>
            {pending === "paymob"
              ? "Redirecting to Paymob…"
              : `Pay ${formatPrice(priceMonthly)} with Paymob`}
          </span>
          <span className="text-xs opacity-80">EGP · cards / wallets / Fawry</span>
        </button>

        <button
          onClick={() => handlePay("paypal")}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-md bg-[#0070ba] px-4 py-3 text-sm font-medium text-white hover:bg-[#005ea6] disabled:opacity-60"
        >
          <span>
            {pending === "paypal"
              ? "Redirecting to PayPal…"
              : `Pay ${usdLabel} with PayPal`}
          </span>
          <span className="text-xs opacity-90">USD · international</span>
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
        <span aria-hidden>🔒</span>
        <span>
          Payments processed by Paymob (EGP) or PayPal (USD). We never see your card number.
        </span>
      </div>
    </div>
  );
}
