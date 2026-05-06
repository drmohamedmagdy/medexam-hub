"use client";

import { useActionState } from "react";
import { signupAction, type AuthState } from "@/app/actions/auth";

type Labels = {
  name: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  submitLoading: string;
};

export default function SignupForm({
  labels,
  referralCode,
}: {
  labels: Labels;
  referralCode?: string | null;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, null);

  return (
    <form action={action} className="mt-8 space-y-4">
      {referralCode && <input type="hidden" name="referralCode" value={referralCode} />}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">{labels.name}</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">{labels.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">{labels.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">{labels.passwordHint}</p>
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5 sm:text-sm"
      >
        {pending ? labels.submitLoading : labels.submit}
      </button>
    </form>
  );
}
