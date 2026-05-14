import Link from "next/link";
import type { Plan } from "@/generated/prisma/client";
import { PLAN_LIMITS, priceForCycle } from "@/lib/plans";

// Shown when the user has hit their monthly question quota. Replaces a
// dead-end "you ran out" with a positive frame ("you're a serious
// studier — here's how to keep going") + concrete upgrade options.
//
// This is the highest-converting touchpoint in the whole app: the
// user has demonstrated they want to use the product and now physically
// cannot, with a clear next-step in front of them.

// Suggest the next plan up. FREE → BASIC → PRO → PREMIUM.
function suggestNextPlan(plan: Plan): Plan | null {
  if (plan === "FREE") return "BASIC";
  if (plan === "BASIC") return "PRO";
  if (plan === "PRO") return "PREMIUM";
  return null;
}

export default function QuotaUpsell({
  plan,
  monthlyQuestions,
}: {
  plan: Plan;
  monthlyQuestions: number;
}) {
  const next = suggestNextPlan(plan);
  if (!next) {
    // PREMIUM user hit their cap — nothing to upgrade to, encourage
    // top-ups / let them know the cap resets monthly.
    return (
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
          You hit your monthly question cap 🔥
        </h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          You answered all {monthlyQuestions.toLocaleString()} questions this month —
          impressive. Your quota resets on the 1st. Until then, you can
          still review your past exams and clear spaced-repetition cards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/review"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Clear review cards →
          </Link>
          <Link
            href="/exams"
            className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/60"
          >
            Browse past exams
          </Link>
        </div>
      </div>
    );
  }

  const nextCfg = PLAN_LIMITS[next];
  const monthlyPrice = priceForCycle(next, 1);
  const annualPrice = priceForCycle(next, 12);
  const isFreeUser = plan === "FREE";

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-5 shadow-md dark:border-blue-700 dark:from-blue-950/40 dark:via-zinc-900 dark:to-amber-950/30 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-blue-600 text-2xl text-white">
          🎯
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold sm:text-xl">
            {isFreeUser
              ? "You've used all your free questions — and you're just getting started"
              : `You've maxed out your ${PLAN_LIMITS[plan].label} plan this month`}
          </h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            You answered <strong>{monthlyQuestions.toLocaleString()}</strong>{" "}
            {isFreeUser ? "questions on the Free tier this month" : `questions this month`} —
            you&apos;re serious about exam prep.{" "}
            <strong>{nextCfg.label}</strong> gives you{" "}
            <strong>{nextCfg.monthlyQuestions.toLocaleString()}</strong>{" "}
            questions/month
            {next === "PRO" || next === "PREMIUM" ? ", PDF export, " : ", "}
            and {nextCfg.fileUploadsPerMonth} file uploads/month.
          </p>
        </div>
      </div>

      {/* Side-by-side monthly vs annual */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/checkout/${next.toLowerCase()}`}
          className="flex flex-col items-start gap-1 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Monthly
          </span>
          <span className="text-2xl font-bold">
            {monthlyPrice.total.toLocaleString()}{" "}
            <span className="text-base font-medium text-zinc-500">EGP/mo</span>
          </span>
          <span className="text-xs text-zinc-500">
            Cancel anytime
          </span>
        </Link>
        <Link
          href={`/checkout/${next.toLowerCase()}?cycle=12`}
          className="relative flex flex-col items-start gap-1 rounded-xl border-2 border-emerald-500 bg-white p-4 transition hover:shadow-md dark:bg-zinc-900"
        >
          <span className="absolute -top-2 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            SAVE {annualPrice.savingsPct}%
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Annual (best value)
          </span>
          <span className="text-2xl font-bold">
            {annualPrice.perMonth.toLocaleString()}{" "}
            <span className="text-base font-medium text-zinc-500">EGP/mo</span>
          </span>
          <span className="text-xs text-zinc-500">
            {annualPrice.total.toLocaleString()} EGP billed once / 12 months
          </span>
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        🔒 Secure payment via Paymob • Cancel anytime • 14-day money-back guarantee •{" "}
        <Link href="/plans" className="text-blue-600 hover:underline">
          See all plans
        </Link>
      </p>
    </div>
  );
}
