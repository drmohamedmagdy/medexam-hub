"use client";

import { useActionState } from "react";
import { adminBroadcastAction, type BroadcastState } from "@/app/actions/admin-email";

export default function BroadcastForm() {
  const [state, action, pending] = useActionState<BroadcastState, FormData>(
    adminBroadcastAction,
    null
  );

  return (
    <form
      action={action}
      className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-lg font-semibold">Compose</h2>

      <div>
        <label className="block text-sm font-medium">Segment</label>
        <select
          name="segment"
          defaultValue="ALL_OPTIN"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ALL_OPTIN">All marketing-opt-in users</option>
          <option value="FREE">Free plan users</option>
          <option value="BASIC">Basic plan users</option>
          <option value="PRO">Pro plan users</option>
          <option value="PREMIUM">Premium plan users</option>
          <option value="RESEARCHER">Researcher plan users</option>
          <option value="PAID">All paid users (Basic / Pro / Premium / Researcher)</option>
          <option value="INACTIVE">Inactive 30+ days</option>
          <option value="FAILED_BROADCAST">⚠️ Recently failed broadcast (last 7 days, didn&apos;t receive any successful broadcast since)</option>
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Only users who haven&apos;t unsubscribed from marketing emails will receive your message.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">Subject</label>
        <input
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. New feature: file upload exams"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Body (HTML allowed)</label>
        <textarea
          name="body"
          required
          rows={10}
          minLength={20}
          maxLength={20000}
          placeholder={`<p>Hi {firstName},</p>\n<p>...</p>\n<p><a href="https://medexam-hub.vercel.app/exams">Review your exams</a></p>`}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Placeholders: <code className="font-mono">{"{firstName}"}</code>, <code className="font-mono">{"{name}"}</code>, <code className="font-mono">{"{email}"}</code>, <code className="font-mono">{"{planLabel}"}</code>. Unsubscribe footer is appended automatically.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="dryRun" name="dryRun" defaultChecked className="rounded" />
        <label htmlFor="dryRun" className="text-sm">
          Dry run — count recipients without sending
        </label>
      </div>

      {state && "error" in state && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.dryRun
            ? `Dry run: would send to ${state.recipients} users.`
            : `Queued for delivery to ${state.recipients} users (${state.sent ?? 0} sent so far).`}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Run"}
      </button>
    </form>
  );
}
