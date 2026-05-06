"use client";

import { useActionState } from "react";
import {
  redeemBonusQuotaAction,
  type RedeemState,
} from "@/app/actions/credits";
import type { Translations } from "@/lib/i18n";

type CreditsT = Translations["credits"];

const QUESTION_BUNDLES = [
  { amount: 10, cost: 50 },
  { amount: 25, cost: 125 },
  { amount: 50, cost: 250 },
] as const;

const FILE_BUNDLES = [
  { amount: 1, cost: 15 },
  { amount: 3, cost: 45 },
] as const;

export default function RedeemCreditsCard({
  balance,
  planLabel,
  t,
}: {
  balance: number;
  planLabel: string;
  t: CreditsT;
}) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(
    redeemBonusQuotaAction,
    null
  );

  // Body has the {plan} token wrapped with a <strong> tag for emphasis.
  const bodyParts = t.redeemBody.split("{plan}");

  return (
    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.redeemHeading}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {bodyParts[0]}
            <strong>{planLabel}</strong>
            {bodyParts.slice(1).join("{plan}")}
          </p>
        </div>
        <div className="text-end text-xs text-zinc-500">
          {t.redeemBalanceLabel}{" "}
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
            {balance.toLocaleString()}
          </span>{" "}
          {t.redeemBalanceSuffix}
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t.redeemSuccess}
        </p>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t.redeemQuestionsHeading} <span className="ml-1 text-xs text-zinc-500">{t.redeemQuestionsCostHint}</span>
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {QUESTION_BUNDLES.map((b) => (
            <Bundle
              key={`q-${b.amount}`}
              kind="questions"
              amount={b.amount}
              cost={b.cost}
              disabled={balance < b.cost || pending}
              action={action}
              label={t.redeemQuestionBundle.replace("{n}", b.amount.toString())}
              costLabel={t.redeemCostFmt.replace("{n}", b.cost.toString())}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t.redeemFilesHeading} <span className="ml-1 text-xs text-zinc-500">{t.redeemFilesCostHint}</span>
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FILE_BUNDLES.map((b) => (
            <Bundle
              key={`f-${b.amount}`}
              kind="files"
              amount={b.amount}
              cost={b.cost}
              disabled={balance < b.cost || pending}
              action={action}
              label={
                b.amount === 1
                  ? t.redeemFileBundleOne
                  : t.redeemFileBundleMany.replace("{n}", b.amount.toString())
              }
              costLabel={t.redeemCostFmt.replace("{n}", b.cost.toString())}
            />
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">{t.redeemRenewTip}</p>
    </section>
  );
}

function Bundle({
  kind,
  amount,
  cost,
  disabled,
  action,
  label,
  costLabel,
}: {
  kind: "questions" | "files";
  amount: number;
  cost: number;
  disabled: boolean;
  action: (formData: FormData) => void;
  label: string;
  costLabel: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="amount" value={String(amount)} />
      <button
        type="submit"
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-300 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-600 dark:hover:bg-amber-950/40 dark:disabled:hover:border-zinc-700 dark:disabled:hover:bg-zinc-900"
      >
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-zinc-500">{costLabel}</span>
      </button>
    </form>
  );
}
