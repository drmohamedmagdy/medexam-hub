"use client";

import { useActionState, useEffect, useState } from "react";
import { resendVerificationAction, type ResendVerifyState } from "@/app/actions/auth";

export default function VerifyEmailBanner({
  email,
  justVerified,
}: {
  email: string;
  justVerified?: boolean;
}) {
  const [state, action, pending] = useActionState<ResendVerifyState, FormData>(
    resendVerificationAction,
    null
  );
  const [showSuccessFlash, setShowSuccessFlash] = useState(!!justVerified);

  useEffect(() => {
    if (justVerified) {
      const t = setTimeout(() => setShowSuccessFlash(false), 6000);
      return () => clearTimeout(t);
    }
  }, [justVerified]);

  if (showSuccessFlash) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✓ Email verified. Welcome aboard.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-amber-900 dark:text-amber-200">
        <strong>Confirm your email.</strong> We sent a verification link to{" "}
        <span className="font-mono">{email}</span>. Check your inbox (and spam folder).
      </div>
      <form action={action}>
        {state?.ok ? (
          <span className="inline-block rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Email sent. Check your inbox.
          </span>
        ) : state?.error ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-700 dark:text-red-400">{state.error}</span>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-zinc-900 dark:text-amber-200 dark:hover:bg-zinc-800"
            >
              {pending ? "Sending…" : "Try again"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-zinc-900 dark:text-amber-200 dark:hover:bg-zinc-800"
          >
            {pending ? "Sending…" : "Resend email"}
          </button>
        )}
      </form>
    </div>
  );
}
