"use client";

import { useActionState, useMemo, useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import {
  BILLING_CYCLES,
  formatPrice,
  priceForCycle,
  type BillingCycle,
} from "@/lib/plans";
import type { Translations } from "@/lib/i18n";
import { applyPromoAction, type PromoApplyState } from "@/app/actions/promo";

type AppliedPromo = {
  code: string;
  finalCents: number;
  originalCents: number;
  discountCents: number;
};

type CheckoutT = Translations["checkout"];

// Egyptian phone in E.164: +20 followed by 10 digits.
const EG_PHONE_RE = /^\+20[0-9]{10}$/;

function normalizePhone(raw: string): string {
  // Accept user input in any common form and normalise to +20XXXXXXXXXX.
  //   01012345678        → +201012345678
  //   201012345678       → +201012345678
  //   +20 10 1234 5678   → +201012345678
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith("0") && digits.length >= 11) return `+20${digits.slice(1, 11)}`;
  if (digits.length === 10) return `+20${digits}`;
  return raw.trim();
}

export default function CheckoutForm({
  plan,
  t,
  initialPhone,
  initialCycle,
}: {
  plan: Plan;
  t: CheckoutT;
  initialPhone: string;
  initialCycle: BillingCycle;
}) {
  const [months, setMonths] = useState<BillingCycle>(initialCycle);
  const [phone, setPhone] = useState(initialPhone);
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

  const cycles = useMemo(
    () => BILLING_CYCLES.map((m) => priceForCycle(plan, m)),
    [plan]
  );
  const selectedCycle = cycles.find((c) => c.months === months) ?? cycles[0];

  // Promo discount percentage gets re-applied on top of the cycle price.
  const promoPct = promo
    ? promo.discountCents / Math.max(1, promo.originalCents)
    : 0;
  const finalCents = Math.round(selectedCycle.total * 100 * (1 - promoPct));
  const finalAmount = Math.round(finalCents / 100);
  const effectivePromoCode = promo?.code ?? (promoInput.trim() || null);

  // Phone is optional. If the user types something, we try to normalise it
  // to E.164 (+20XXXXXXXXXX) and only pass it to the API if it parses; an
  // unparseable value is silently dropped rather than blocking checkout —
  // we don't want the form to be a wall for international users.
  const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
  const phoneValid = !normalizedPhone || EG_PHONE_RE.test(normalizedPhone);

  async function handlePay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          promoCode: effectivePromoCode,
          durationMonths: months,
          // Only send phone if it parsed cleanly. The backend treats it as
          // optional and falls back to the saved User.phone if available.
          ...(EG_PHONE_RE.test(normalizedPhone) ? { phone: normalizedPhone } : {}),
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
    <div className="mt-6 space-y-5">
      {/* Billing cycle picker */}
      <fieldset>
        <legend className="text-sm font-medium">Choose billing period</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cycles.map((c) => (
            <CycleOption
              key={c.months}
              months={c.months}
              total={c.total}
              perMonth={c.perMonth}
              savingsPct={c.savingsPct}
              checked={c.months === months}
              onSelect={() => setMonths(c.months)}
            />
          ))}
        </div>
      </fieldset>

      {/* Promo code */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t.promoApplied.replace("{code}", promo.code)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {Math.round(promoPct * 100)}% off applied to your selected period
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

      {/* Total + Paymob CTA */}
      <div className="space-y-4">
        {/* Phone is optional — used by Paymob for OTP and by some banks
            for fraud checks. Customers outside Egypt can leave it blank. */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Mobile number <span className="text-xs font-normal text-zinc-500">(optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Helps banks verify the payment. For mobile-wallet payments
            (Vodafone Cash / Etisalat / Orange), use the number registered
            with your wallet provider.
          </p>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {phone && !phoneValid && (
            <p className="mt-1 text-xs text-zinc-500">
              Egyptian format would be 11 digits starting with 01. Anything else is fine too — it just won&apos;t be auto-detected.
            </p>
          )}
        </div>

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

        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
          <span className="text-zinc-600 dark:text-zinc-400">
            Total for {months} {months === 1 ? "month" : "months"}
          </span>
          <span className="font-semibold">{formatPrice(finalAmount)}</span>
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

function CycleOption({
  months,
  total,
  perMonth,
  savingsPct,
  checked,
  onSelect,
}: {
  months: BillingCycle;
  total: number;
  perMonth: number;
  savingsPct: number;
  checked: boolean;
  onSelect: () => void;
}) {
  const label =
    months === 1
      ? "Monthly"
      : months === 12
        ? "Annual"
        : `${months} months`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`relative flex flex-col items-start gap-1 rounded-lg border-2 px-3 py-3 text-left transition ${
        checked
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      {savingsPct > 0 && (
        <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          −{savingsPct}%
        </span>
      )}
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-base font-semibold">{total.toLocaleString()} EGP</span>
      <span className="text-[11px] text-zinc-500">
        {perMonth.toLocaleString()} EGP / month
      </span>
    </button>
  );
}
