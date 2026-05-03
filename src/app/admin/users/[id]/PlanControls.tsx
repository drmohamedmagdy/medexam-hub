"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminChangePlanAction,
  adminExtendExpiryAction,
  adminCancelSubscriptionAction,
  adminDeleteUserAction,
  type AdminActionState,
} from "@/app/actions/admin";
import type { Plan } from "@/generated/prisma/client";

const PLANS: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM"];

export default function PlanControls({
  userId,
  currentPlan,
  userEmail,
}: {
  userId: string;
  currentPlan: Plan;
  userEmail: string;
}) {
  const [changeState, changeAction, changePending] = useActionState<AdminActionState, FormData>(
    adminChangePlanAction,
    null
  );
  const [extendState, extendAction, extendPending] = useActionState<AdminActionState, FormData>(
    adminExtendExpiryAction,
    null
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<AdminActionState, FormData>(
    adminCancelSubscriptionAction,
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
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{changeState.error}</p>
        )}
        {changeState?.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Plan updated.</p>
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
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{extendState.error}</p>
        )}
        {extendState?.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Expiry extended.</p>
        )}
      </form>

      {/* Cancel subscription */}
      <form action={cancelAction} className="space-y-3 lg:col-span-2">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-sm font-medium">Cancel subscription (admin override)</label>
        <button
          type="submit"
          disabled={cancelPending || currentPlan === "FREE"}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {cancelPending ? "Cancelling…" : "Mark cancelled"}
        </button>
        <p className="text-xs text-zinc-500">
          If they have a paid period left, sets planCancelledAt (no auto-renew, kept until expiry).
          If no active billing, drops them to Free immediately.
        </p>
        {cancelState?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{cancelState.error}</p>
        )}
        {cancelState?.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Subscription cancelled.
          </p>
        )}
      </form>

      {/* Danger zone — delete user */}
      <DeleteUserBlock userId={userId} userEmail={userEmail} />
    </div>
  );
}

function DeleteUserBlock({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminDeleteUserAction,
    null
  );

  // Run navigation as a side effect — calling router.push() during render is a
  // React anti-pattern that can fail to fire and leaves you stuck on the
  // (now-404) deleted user's URL.
  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/users");
    }
  }, [state?.ok, router]);

  const canDelete = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  return (
    <div className="lg:col-span-2 rounded-2xl border border-red-300 bg-red-50/30 p-5 dark:border-red-900 dark:bg-red-950/20">
      <div className="text-sm font-semibold text-red-800 dark:text-red-300">Danger zone</div>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        Permanently delete this user and all their data — exams, questions, payment history,
        uploaded files, sessions. <strong>Cannot be undone.</strong>
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-md border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
        >
          Delete user account
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <label className="block text-sm">
            To confirm, type the user&apos;s email exactly:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              {userEmail}
            </code>
          </label>
          <input
            name="confirmEmail"
            type="text"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={userEmail}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            autoComplete="off"
            spellCheck={false}
          />
          {state?.error && (
            <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{state.error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || !canDelete}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Permanently delete user"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmEmail("");
              }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
