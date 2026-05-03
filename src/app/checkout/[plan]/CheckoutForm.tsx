"use client";

import { useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";

export default function CheckoutForm({
  plan,
  priceMonthly,
}: {
  plan: Plan;
  priceMonthly: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You&apos;ll be redirected to Paymob to enter your card details. After successful payment,
        return to this site to activate your plan.
      </p>

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
        className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Redirecting to Paymob…" : `Pay ${formatPrice(priceMonthly)} with Paymob`}
      </button>
    </div>
  );
}
