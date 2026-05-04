"use client";

import { useActionState } from "react";
import {
  adminCreatePromoAction,
  adminUpdatePromoAction,
  type PromoFormState,
} from "@/app/actions/promo";

type Mode = "create" | "edit";

export type PromoFormDefaults = {
  id?: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  applicablePlans: Array<"BASIC" | "PRO" | "PREMIUM">; // empty = ALL
  maxUses: number | null;
  maxUsesPerUser: number;
  expiresAt: string | null; // YYYY-MM-DD
  isActive: boolean;
  paymobLinkBasic: string;
  paymobLinkPro: string;
  paymobLinkPremium: string;
  notes: string;
};

const PAID_PLANS = ["BASIC", "PRO", "PREMIUM"] as const;

export default function PromoForm({
  mode,
  defaults,
}: {
  mode: Mode;
  defaults: PromoFormDefaults;
}) {
  const action = mode === "create" ? adminCreatePromoAction : adminUpdatePromoAction;
  const [state, formAction, pending] = useActionState<PromoFormState, FormData>(action, null);

  const allPlansSelected =
    defaults.applicablePlans.length === 0 || defaults.applicablePlans.length === 3;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" hint="Case-insensitive — saved uppercase.">
          <input
            name="code"
            type="text"
            required
            defaultValue={defaults.code}
            placeholder="OMAR2026"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 font-mono uppercase placeholder:normal-case dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Discount type">
          <select
            name="discountType"
            required
            defaultValue={defaults.discountType}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="PERCENT">Percentage (%)</option>
            <option value="FIXED">Fixed amount (EGP)</option>
          </select>
        </Field>
      </div>

      <Field label="Discount value" hint="For percentage: 1–100. For fixed: amount in EGP.">
        <input
          name="discountValue"
          type="number"
          required
          min={1}
          defaultValue={defaults.discountValue}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Applicable plans"
        hint="Leave all unchecked OR check all to apply to every paid plan."
      >
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PAID_PLANS.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              <input
                type="checkbox"
                name="applicablePlans"
                value={p}
                defaultChecked={
                  allPlansSelected || defaults.applicablePlans.includes(p)
                }
                className="h-4 w-4 rounded"
              />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Total uses" hint="0 or empty = unlimited.">
          <input
            name="maxUses"
            type="number"
            min={0}
            defaultValue={defaults.maxUses ?? ""}
            placeholder="Unlimited"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Per-user uses" hint="How many times one user can redeem.">
          <input
            name="maxUsesPerUser"
            type="number"
            required
            min={0}
            defaultValue={defaults.maxUsesPerUser}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Expires on" hint="Leave empty for no expiry.">
          <input
            name="expiresAt"
            type="date"
            defaultValue={defaults.expiresAt ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <details className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <summary className="cursor-pointer text-sm font-semibold text-amber-900 dark:text-amber-200">
          Optional: Paymob link overrides
        </summary>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          By default, redemptions go to the standard Paymob link for the plan, which charges
          the standard plan price. To make this promo actually charge the discounted amount in
          Paymob, create new Paymob payment links at the discounted prices and paste their
          URLs here. Leave blank to use the default link.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Basic link">
            <input
              name="paymobLinkBasic"
              type="url"
              defaultValue={defaults.paymobLinkBasic}
              placeholder="https://paymob.xyz/..."
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label="Pro link">
            <input
              name="paymobLinkPro"
              type="url"
              defaultValue={defaults.paymobLinkPro}
              placeholder="https://paymob.xyz/..."
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label="Premium link">
            <input
              name="paymobLinkPremium"
              type="url"
              defaultValue={defaults.paymobLinkPremium}
              placeholder="https://paymob.xyz/..."
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>
      </details>

      <Field label="Internal notes" hint="Visible only to admins.">
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          maxLength={500}
          placeholder="e.g. Influencer Omar's launch campaign"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
          className="h-4 w-4 rounded"
        />
        <span>Active (uncheck to disable without deleting)</span>
      </label>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && mode === "edit" && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create promo code"
            : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
