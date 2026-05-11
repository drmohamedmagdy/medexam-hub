"use client";

import { useActionState } from "react";
import { createStudyNoteAction, type NoteState } from "@/app/actions/study-notes";

export default function NewNoteForm({
  specialties,
  examTypes,
  locales,
}: {
  specialties: string[];
  examTypes: Array<{ value: string; label: string }>;
  locales: Array<{ value: string; label: string }>;
}) {
  const [state, action, pending] = useActionState<NoteState, FormData>(
    createStudyNoteAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="block text-sm font-medium">Topic</span>
        <input
          type="text"
          name="topic"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Diabetic foot ulcer management"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Be specific — "Heart failure NICE guidelines" gives sharper notes
          than just "Heart failure".
        </p>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium">Specialty (optional)</span>
          <select
            name="specialty"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— any —</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Exam style (optional)</span>
          <select
            name="examType"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— any —</option>
            {examTypes.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium">Language</span>
        <select
          name="language"
          defaultValue="en"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {locales.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
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
        {pending ? "Generating… (~10s)" : "✨ Generate note"}
      </button>
      <p className="text-xs text-zinc-500">
        Limit: 10 notes per hour. Notes are saved so you can re-read them
        anytime.
      </p>
    </form>
  );
}
