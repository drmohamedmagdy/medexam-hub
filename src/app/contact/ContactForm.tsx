"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/app/actions/contact";

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-lg text-white">
            ✓
          </div>
          <div>
            <h3 className="text-base font-semibold">Message sent</h3>
            <p className="mt-1 text-sm">
              Thanks — we&apos;ve got your message and we&apos;ll reply soon.
              Check the email you provided for our response.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium">Full name</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Dr. Jane Smith"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium">Email address</span>
          <input
            type="email"
            name="email"
            required
            maxLength={200}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-medium">Subject</span>
        <select
          name="subject"
          required
          defaultValue="billing"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="billing">Account / billing</option>
          <option value="exam-content">Exam content issue</option>
          <option value="feature">Feature request</option>
          <option value="partnership">Partnership / institutional</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-sm font-medium">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="Tell us how we can help…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-zinc-500">
        We typically reply within one business day. Urgent issues — try
        WhatsApp above.
      </p>
    </form>
  );
}
