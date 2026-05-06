"use client";

import { useState } from "react";

export default function ReferralCard({
  referralUrl,
  balance,
}: {
  referralUrl: string;
  balance: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function shareWhatsapp() {
    const text = encodeURIComponent(
      `Try MedExam Hub — AI-generated medical exams in 10 languages. Sign up with my link and we both get bonus credits: ${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/30 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">🎁 Invite friends, earn credits</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Share your link. When a friend signs up and picks a paid plan, you earn credits — usable as a discount on your next plan.
          </p>
        </div>
        <div className="text-end">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your credits
          </div>
          <div className="mt-1 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-3xl font-bold text-transparent dark:from-emerald-300 dark:to-teal-300">
            {balance.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Your invite link
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={referralUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 sm:flex-none dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              onClick={shareWhatsapp}
              className="flex-1 rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 sm:flex-none dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-xs text-zinc-600 dark:text-zinc-300 sm:grid-cols-3">
        <li className="flex items-start gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">+50</span>
          <span>credits when a friend joins Basic</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">+100</span>
          <span>credits when they join Pro</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">+200</span>
          <span>credits when they join Premium</span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        Use credits as a discount on your next Vodafone Cash or Instapay plan purchase. 1 credit = 1 EGP off, capped at 50% of the order.
      </p>
    </section>
  );
}
