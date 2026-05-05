"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/actions/auth";

type Labels = {
  email: string;
  password: string;
  submit: string;
  submitLoading: string;
};

export default function LoginForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);

  return (
    <form action={action} className="mt-8 space-y-4">
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
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="block text-sm font-medium">{labels.password}</label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-400"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
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
      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-blue-600 hover:underline dark:text-cyan-400"
        >
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
