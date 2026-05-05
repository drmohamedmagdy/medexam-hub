"use client";

import { useActionState, useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";
import { applyPromoAction, type PromoApplyState } from "@/app/actions/promo";
import { submitManualPaymentAction, type ManualPayState } from "@/app/actions/manual-payment";
import {
  VODAFONE_CASH_DISPLAY,
  VODAFONE_CASH_NUMBER,
  INSTAPAY_LINK,
  INSTAPAY_HANDLE_DISPLAY,
} from "@/lib/manual-payments";

type AppliedPromo = {
  code: string;
  finalCents: number;
  originalCents: number;
  discountCents: number;
};

type Method = "CARD" | "VODAFONE_CASH" | "INSTAPAY";

export default function CheckoutForm({
  plan,
  priceMonthly,
}: {
  plan: Plan;
  priceMonthly: number;
}) {
  const [method, setMethod] = useState<Method>("CARD");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoState, promoAction, promoPending] = useActionState<PromoApplyState, FormData>(
    applyPromoAction,
    null
  );
  const [manualState, manualAction, manualPending] = useActionState<ManualPayState, FormData>(
    submitManualPaymentAction,
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

  async function handleCardPay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, promoCode: promo?.code ?? null }),
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
      {/* Promo code section (applies to all methods) */}
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

      {/* Method picker */}
      <fieldset>
        <legend className="text-sm font-medium">Choose how to pay</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MethodOption
            id="CARD"
            label="Card"
            sublabel="Visa / Mastercard via Paymob"
            icon="💳"
            checked={method === "CARD"}
            onSelect={() => setMethod("CARD")}
          />
          <MethodOption
            id="VODAFONE_CASH"
            label="Vodafone Cash"
            sublabel="Send to wallet"
            icon="📱"
            checked={method === "VODAFONE_CASH"}
            onSelect={() => setMethod("VODAFONE_CASH")}
          />
          <MethodOption
            id="INSTAPAY"
            label="Instapay"
            sublabel="Pay via link"
            icon="⚡"
            checked={method === "INSTAPAY"}
            onSelect={() => setMethod("INSTAPAY")}
          />
        </div>
      </fieldset>

      {/* Per-method content */}
      {method === "CARD" && (
        <div className="space-y-4">
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
            onClick={handleCardPay}
            disabled={pending}
            className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
          >
            {pending ? "Redirecting to Paymob…" : `Pay ${formatPrice(finalAmount)} with Paymob`}
          </button>
        </div>
      )}

      {method === "VODAFONE_CASH" && (
        <ManualForm
          plan={plan}
          method="VODAFONE_CASH"
          amount={finalAmount}
          promoCode={promo?.code ?? null}
          action={manualAction}
          state={manualState}
          pending={manualPending}
          instructions={
            <VodafoneInstructions amount={finalAmount} />
          }
        />
      )}

      {method === "INSTAPAY" && (
        <ManualForm
          plan={plan}
          method="INSTAPAY"
          amount={finalAmount}
          promoCode={promo?.code ?? null}
          action={manualAction}
          state={manualState}
          pending={manualPending}
          instructions={
            <InstapayInstructions amount={finalAmount} />
          }
        />
      )}
    </div>
  );
}

function MethodOption({
  id,
  label,
  sublabel,
  icon,
  checked,
  onSelect,
}: {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`flex flex-col items-start gap-1 rounded-lg border-2 px-3 py-3 text-left transition ${
        checked
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <span className="text-2xl" aria-hidden>{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-zinc-500">{sublabel}</span>
      <span className="sr-only">{id}</span>
    </button>
  );
}

function VodafoneInstructions({ amount }: { amount: number }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(VODAFONE_CASH_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <p className="font-semibold">Send {amount.toLocaleString()} EGP to this Vodafone Cash wallet</p>
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 font-mono text-base font-semibold dark:bg-zinc-900">
        <span>{VODAFONE_CASH_DISPLAY}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {copied ? "Copied!" : "Copy number"}
        </button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700 dark:text-zinc-300">
        <li>Open My Vodafone or dial *9*7# and choose Send Money.</li>
        <li>Send <strong>{amount.toLocaleString()} EGP</strong> to <strong>{VODAFONE_CASH_DISPLAY}</strong>.</li>
        <li>You&apos;ll get an SMS with a transaction reference (looks like <code>VC123456789</code>).</li>
        <li>Paste that reference below — we&apos;ll verify and activate your plan, usually within 24h.</li>
      </ol>
    </div>
  );
}

function InstapayInstructions({ amount }: { amount: number }) {
  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
      <p className="font-semibold">Send {amount.toLocaleString()} EGP via Instapay</p>
      <a
        href={INSTAPAY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Open Instapay link →
      </a>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
        Or copy this URL: <code className="font-mono">{INSTAPAY_HANDLE_DISPLAY}</code>
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700 dark:text-zinc-300">
        <li>Tap the button above — it opens your bank&apos;s Instapay flow.</li>
        <li>Enter <strong>{amount.toLocaleString()} EGP</strong> and confirm.</li>
        <li>Copy the transaction reference / receipt ID from your bank.</li>
        <li>Paste it below — we&apos;ll verify and activate your plan, usually within 24h.</li>
      </ol>
    </div>
  );
}

function ManualForm({
  plan,
  method,
  amount,
  promoCode,
  action,
  state,
  pending,
  instructions,
}: {
  plan: Plan;
  method: "VODAFONE_CASH" | "INSTAPAY";
  amount: number;
  promoCode: string | null;
  action: (formData: FormData) => void;
  state: ManualPayState;
  pending: boolean;
  instructions: React.ReactNode;
}) {
  return (
    <form action={action} className="space-y-4">
      {instructions}

      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="method" value={method} />
      {promoCode && <input type="hidden" name="promoCode" value={promoCode} />}

      <div>
        <label htmlFor="proofRef" className="block text-sm font-medium">
          Transaction reference <span className="text-red-600">*</span>
        </label>
        <input
          id="proofRef"
          name="proofRef"
          type="text"
          required
          minLength={3}
          maxLength={120}
          autoComplete="off"
          placeholder={method === "VODAFONE_CASH" ? "e.g. VC123456789" : "e.g. IPN-2026-XXXXX"}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {method === "VODAFONE_CASH"
            ? "From the SMS Vodafone sent you after sending the money."
            : "From your bank's confirmation screen or SMS receipt."}
        </p>
      </div>

      <div>
        <label htmlFor="proofNote" className="block text-sm font-medium">
          Note (optional)
        </label>
        <textarea
          id="proofNote"
          name="proofNote"
          rows={2}
          maxLength={500}
          placeholder="Anything you'd like the admin to know."
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {pending ? "Submitting…" : `I've paid ${amount.toLocaleString()} EGP — submit for review`}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Your plan activates as soon as we verify the payment (usually within 24 hours).
      </p>
    </form>
  );
}
