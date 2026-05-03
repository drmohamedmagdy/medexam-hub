"use client";

import { useActionState } from "react";
import {
  adminChangePlanAction,
  adminExtendExpiryAction,
  adminCancelSubscriptionAction,
  type AdminActionState,
} from "@/app/actions/admin";
import type { Plan } from "@/generated/prisma/client";

const PLANS: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM"];

export default function PlanControls({
  userId,
  currentPlan,
}: {
  userId: string;
  currentPlan: Plan;
}) {
  const [changeState, changeAction, changePending] = useActionState<AdminActionState, FormData>(
    adminChangePlanAction,
    null
  );
  const [extendState, extendAction, extendPending] = useActionState<AdminActionState, FormData>(
    adminExtendExpiryAction,
    null
  );

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      {/* Change plan */}
      <form action={changeAction} className="space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-sm font-medium">Change plan</label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            name="plan"
            defaultValue={currentPlan}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            name="daysFromNow"
            type="number"
            min={1}
            max={365 * 5}
            placeholder="30 days"
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={changePending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {changePending ? "…" : "Apply"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Setting to FREE clears the billing period. Otherwise, sets new period from now (defaults to 30 days).
        </p>
        {changeState?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {changeState.error}
          </p>
        )}
        {changeState?.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Plan updated.
          </p>
        )}
      </form>

      {/* Extend expiry */}
      <form action={extendAction} className="space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-sm font-medium">Extend current expiry</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="days"
            type="number"
            min={1}
            max={365}
            defaultValue={30}
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-sm">days</span>
          <button
            type="submit"
            disabled={extendPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {extendPending ? "…" : "Extend"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Adds days to the current expiry. Use this when a Paymob payment succeeded but didn&apos;t auto-upgrade.
        </p>
        {extendState?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {extendState.error}
          </p>
        )}
        {extendState?.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Expiry extended.
          </p>
        )}
      </form>

      {/* Cancel subscription */}
      <form action={adminCancelSubscriptionAction} className="space-y-3 lg:col-span-2">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-sm font-medium">Cancel subscription (admin override)</label>
        <button
          type="submit"
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Mark cancelled
        </button>
        <p className="text-xs text-zinc-500">
          Sets planCancelledAt. User keeps access until expiry but won&apos;t auto-renew.
        </p>
      </form>
    </div>
  );
}
