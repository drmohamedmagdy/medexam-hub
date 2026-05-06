"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Plan } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/plans";
import type { Translations } from "@/lib/i18n";
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

type CheckoutT = Translations["checkout"];
type CreditsT = Translations["credits"];

export default function CheckoutForm({
  plan,
  priceMonthly,
  t,
  tCredits,
  creditsBalance = 0,
}: {
  plan: Plan;
  priceMonthly: number;
  t: CheckoutT;
  tCredits: CreditsT;
  creditsBalance?: number;
}) {
  const [method, setMethod] = useState<Method>("CARD");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [creditsToUse, setCreditsToUse] = useState(0);
  // Controlled so the typed value is sent to the server even if the user
  // forgets to click "Apply" — the server validates and applies it anyway.
  const [promoInput, setPromoInput] = useState("");
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

  const promoFinalAmount = promo ? promo.finalCents / 100 : priceMonthly;

  // Credits can offset at most 50% of the post-promo amount.
  const maxCredits = Math.min(creditsBalance, Math.floor(promoFinalAmount * 0.5));
  const cappedCredits = Math.min(creditsToUse, maxCredits);
  const finalAmount = Math.max(0, promoFinalAmount - cappedCredits);

  // Send whatever the user typed, even if they forgot to click "Apply".
  // The server re-validates either way and is the source of truth on price.
  const effectivePromoCode = promo?.code ?? (promoInput.trim() || null);

  async function handleCardPay() {
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
      {/* Promo code section (applies to all methods) */}
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
          <form
            action={promoAction}
            id="promo-form"
            className="space-y-2"
          >
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

      {/* Method picker */}
      <fieldset>
        <legend className="text-sm font-medium">{t.chooseMethod}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MethodOption
            id="CARD"
            label={t.methodCard}
            sublabel={t.methodCardSub}
            icon="💳"
            checked={method === "CARD"}
            onSelect={() => setMethod("CARD")}
          />
          <MethodOption
            id="VODAFONE_CASH"
            label={t.methodVodafone}
            sublabel={t.methodVodafoneSub}
            icon="📱"
            checked={method === "VODAFONE_CASH"}
            onSelect={() => setMethod("VODAFONE_CASH")}
          />
          <MethodOption
            id="INSTAPAY"
            label={t.methodInstapay}
            sublabel={t.methodInstapaySub}
            icon="⚡"
            checked={method === "INSTAPAY"}
            onSelect={() => setMethod("INSTAPAY")}
          />
        </div>
      </fieldset>

      {/* Per-method content */}
      {method === "CARD" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.cardCopy}</p>
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
            onClick={handleCardPay}
            disabled={pending}
            className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
          >
            {pending ? t.cardRedirecting : t.cardPay.replace("{price}", formatPrice(finalAmount))}
          </button>
        </div>
      )}

      {(method === "VODAFONE_CASH" || method === "INSTAPAY") && creditsBalance > 0 && (
        <CreditsRedeem
          balance={creditsBalance}
          maxCredits={maxCredits}
          value={cappedCredits}
          onChange={setCreditsToUse}
          newTotal={finalAmount}
          t={tCredits}
        />
      )}

      {method === "VODAFONE_CASH" && (
        <ManualForm
          plan={plan}
          method="VODAFONE_CASH"
          amount={finalAmount}
          promoCode={effectivePromoCode}
          creditsToUse={cappedCredits}
          action={manualAction}
          state={manualState}
          pending={manualPending}
          t={t}
          instructions={
            <VodafoneInstructions amount={finalAmount} t={t} />
          }
        />
      )}

      {method === "INSTAPAY" && (
        <ManualForm
          plan={plan}
          method="INSTAPAY"
          amount={finalAmount}
          promoCode={effectivePromoCode}
          creditsToUse={cappedCredits}
          action={manualAction}
          state={manualState}
          pending={manualPending}
          t={t}
          instructions={
            <InstapayInstructions amount={finalAmount} t={t} />
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

function CreditsRedeem({
  balance,
  maxCredits,
  value,
  onChange,
  newTotal,
  t,
}: {
  balance: number;
  maxCredits: number;
  value: number;
  onChange: (n: number) => void;
  newTotal: number;
  t: CreditsT;
}) {
  const disabled = maxCredits === 0;
  // Render the {n} balance phrase with a <strong> wrap to match the original UX.
  const availableParts = t.checkoutAvailable.split("{n}");
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {t.checkoutHeading}
          </p>
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
            {availableParts[0]}
            <strong>{balance.toLocaleString()}</strong>
            {availableParts.slice(1).join("{n}")}
            {maxCredits > 0
              ? ` ${t.checkoutCapHint.replace("{max}", maxCredits.toLocaleString())}`
              : ` ${t.checkoutLowAmountHint}`}
          </p>
        </div>
        <div className="text-end">
          <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {t.checkoutDiscountFmt.replace("{n}", value.toLocaleString())}
          </div>
          <div className="text-xs text-zinc-500">
            {t.checkoutNewTotal.replace("{n}", newTotal.toLocaleString())}
          </div>
        </div>
      </div>
      {!disabled && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={maxCredits}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <input
            type="number"
            min={0}
            max={maxCredits}
            value={value}
            onChange={(e) => {
              const n = Math.max(0, Math.min(maxCredits, Number(e.target.value) || 0));
              onChange(n);
            }}
            className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}
    </div>
  );
}

function VodafoneInstructions({ amount, t }: { amount: number; t: CheckoutT }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(VODAFONE_CASH_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  const amountStr = amount.toLocaleString();
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <p className="font-semibold">{t.vodafoneTitle.replace("{amount}", amountStr)}</p>
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 font-mono text-base font-semibold dark:bg-zinc-900">
        <span>{VODAFONE_CASH_DISPLAY}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {copied ? t.vodafoneCopied : t.vodafoneCopy}
        </button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700 dark:text-zinc-300">
        <li>{t.vodafoneStep1}</li>
        <li>{t.vodafoneStep2.replace("{amount}", amountStr).replace("{wallet}", VODAFONE_CASH_DISPLAY)}</li>
        <li>{t.vodafoneStep3}</li>
        <li>{t.vodafoneStep4}</li>
      </ol>
    </div>
  );
}

function InstapayInstructions({ amount, t }: { amount: number; t: CheckoutT }) {
  const amountStr = amount.toLocaleString();
  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
      <p className="font-semibold">{t.instapayTitle.replace("{amount}", amountStr)}</p>
      <a
        href={INSTAPAY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t.instapayOpen}
      </a>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
        {t.instapayOrCopy} <code className="font-mono">{INSTAPAY_HANDLE_DISPLAY}</code>
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700 dark:text-zinc-300">
        <li>{t.instapayStep1}</li>
        <li>{t.instapayStep2.replace("{amount}", amountStr)}</li>
        <li>{t.instapayStep3}</li>
        <li>{t.instapayStep4}</li>
      </ol>
    </div>
  );
}

function ManualForm({
  plan,
  method,
  amount,
  promoCode,
  creditsToUse,
  action,
  state,
  pending,
  instructions,
  t,
}: {
  plan: Plan;
  method: "VODAFONE_CASH" | "INSTAPAY";
  amount: number;
  promoCode: string | null;
  creditsToUse: number;
  action: (formData: FormData) => void;
  state: ManualPayState;
  pending: boolean;
  instructions: React.ReactNode;
  t: CheckoutT;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ url: string; pathname: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setUploaded(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Please pick an image file (JPG, PNG, or HEIC).");
      return;
    }
    setUploadError(null);
    setPreview(URL.createObjectURL(file));
    setUploaded(null);
    setUploading(true);
    setProgressPct(0);
    try {
      const blob = await upload(`payments/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/payments/proof-upload",
        onUploadProgress: ({ percentage }) => setProgressPct(Math.round(percentage)),
      });
      setUploaded({ url: blob.url, pathname: blob.pathname });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploaded(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      {instructions}

      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="method" value={method} />
      {promoCode && <input type="hidden" name="promoCode" value={promoCode} />}
      {creditsToUse > 0 && (
        <input type="hidden" name="creditsToUse" value={String(creditsToUse)} />
      )}
      {uploaded && (
        <>
          <input type="hidden" name="proofImageUrl" value={uploaded.url} />
          <input type="hidden" name="proofImagePathname" value={uploaded.pathname} />
        </>
      )}

      <div>
        <label htmlFor="proofImage" className="block text-sm font-medium">
          {t.proofLabel} <span className="text-red-600">*</span>
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          {method === "VODAFONE_CASH" ? t.proofHintVodafone : t.proofHintInstapay}
        </p>

        {preview ? (
          <div className="mt-3 space-y-3">
            <div className="relative inline-block overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Transaction screenshot preview"
                className="max-h-72 w-auto"
              />
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                  <span className="text-sm font-medium">{t.proofUploading.replace("{pct}", String(progressPct))}</span>
                  <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {uploaded && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {t.proofUploaded}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setUploaded(null);
                setUploadError(null);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.proofChooseDifferent}
            </button>
          </div>
        ) : (
          <label
            htmlFor="proofImage"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
          >
            <span className="text-3xl" aria-hidden>📸</span>
            <span className="font-medium">{t.proofUpload}</span>
            <span className="text-xs text-zinc-500">{t.proofUploadHint}</span>
          </label>
        )}
        <input
          id="proofImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={onFileChange}
          className="sr-only"
        />
        {uploadError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {uploadError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="proofNote" className="block text-sm font-medium">
          {t.noteLabel}
        </label>
        <textarea
          id="proofNote"
          name="proofNote"
          rows={2}
          maxLength={500}
          placeholder={t.notePlaceholder}
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
        disabled={pending || uploading || !uploaded}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {pending
          ? t.submitting
          : uploading
            ? t.submitUploading
            : !uploaded
              ? t.submitDisabled
              : t.submitButton.replace("{amount}", amount.toLocaleString())}
      </button>
      <p className="text-center text-xs text-zinc-500">{t.submitFootnote}</p>
    </form>
  );
}
