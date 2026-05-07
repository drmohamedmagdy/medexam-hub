"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  submitManualPaymentAction,
  type ManualPayState,
} from "@/app/actions/manual-payment";
import {
  VODAFONE_CASH_DISPLAY,
  VODAFONE_CASH_NUMBER,
  INSTAPAY_LINK,
  INSTAPAY_HANDLE_DISPLAY,
} from "@/lib/manual-payments";
import type { Plan } from "@/generated/prisma/client";

type Method = "VODAFONE_CASH" | "INSTAPAY";

export default function TopupCheckoutForm({
  topupKind,
  plan,
  priceEgp,
}: {
  topupKind: "RESEARCH_PROJECT" | "STATS_ANALYSIS";
  plan: Plan;
  priceEgp: number;
}) {
  const [method, setMethod] = useState<Method>("VODAFONE_CASH");
  const [proof, setProof] = useState<{ url: string; pathname: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ManualPayState, FormData>(
    submitManualPaymentAction,
    null
  );

  async function onPickProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const blob = await upload(`payment-proofs/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/payments/proof-upload",
      });
      setProof({ url: blob.url, pathname: blob.pathname });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mt-4 space-y-5">
      {/* Method picker */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod("VODAFONE_CASH")}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
            method === "VODAFONE_CASH"
              ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
          }`}
        >
          Vodafone Cash
        </button>
        <button
          type="button"
          onClick={() => setMethod("INSTAPAY")}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
            method === "INSTAPAY"
              ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
          }`}
        >
          InstaPay
        </button>
      </div>

      {/* Method-specific instructions */}
      <div className="rounded-md bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50">
        {method === "VODAFONE_CASH" ? (
          <>
            <p className="font-medium">Send {priceEgp.toLocaleString()} EGP via Vodafone Cash to:</p>
            <p className="mt-2 font-mono text-base text-blue-700 dark:text-blue-300">
              {VODAFONE_CASH_DISPLAY}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              ({VODAFONE_CASH_NUMBER}) — then upload your transfer screenshot below.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">Send {priceEgp.toLocaleString()} EGP via InstaPay to:</p>
            <a
              href={INSTAPAY_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block break-all font-mono text-base text-blue-700 underline hover:text-blue-900 dark:text-blue-300"
            >
              {INSTAPAY_HANDLE_DISPLAY}
            </a>
            <p className="mt-1 text-xs text-zinc-500">
              Then upload the transfer confirmation screenshot below.
            </p>
          </>
        )}
      </div>

      {/* Proof upload */}
      <div>
        <label className="block text-sm font-medium">
          Payment screenshot <span className="text-red-600">*</span>
        </label>
        {!proof ? (
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
            {uploading ? "Uploading…" : "Upload screenshot"}
            <input
              type="file"
              accept="image/*"
              onChange={onPickProof}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        ) : (
          <div className="mt-2 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proof.url}
              alt="Payment proof"
              className="max-h-48 w-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => setProof(null)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove and re-upload
            </button>
          </div>
        )}
        {uploadError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {uploadError}
          </p>
        )}
      </div>

      {/* Submit form */}
      <form action={action} className="space-y-3">
        <input type="hidden" name="topupKind" value={topupKind} />
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="proofImageUrl" value={proof?.url ?? ""} />
        <input type="hidden" name="proofImagePathname" value={proof?.pathname ?? ""} />

        <label className="block text-sm">
          <span className="block font-medium">Notes (optional)</span>
          <input
            type="text"
            name="proofNote"
            maxLength={500}
            placeholder="Anything we should know about your transfer?"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        {state && !state.ok && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!proof || pending}
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending
            ? "Submitting…"
            : `Submit ${priceEgp.toLocaleString()} EGP payment for review`}
        </button>
        <p className="text-xs text-zinc-500">
          We&apos;ll verify within 24 hours. You&apos;ll get a notification as soon as
          the top-up is added to your account.
        </p>
      </form>
    </div>
  );
}
