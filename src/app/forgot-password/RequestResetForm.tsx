"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type RequestResetState,
} from "@/app/actions/auth";

export default function RequestResetForm() {
  const [state, action, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordResetAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <p className="font-semibold">Check your inbox.</p>
        <p className="mt-1">
          If an account exists for that email, we&apos;ve sent a password reset link.
          The link expires in 1 hour. Don&apos;t forget to check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Your email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          We&apos;ll send a reset link if an account with this email exists.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5 sm:text-sm"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
