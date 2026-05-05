"use client";

import { useActionState } from "react";
import {
  adminEditLibraryAction,
  type LibraryEditState,
} from "@/app/actions/library";

export default function EditForm({
  defaults,
}: {
  defaults: {
    id: string;
    title: string;
    description: string;
    category: string;
    isPublished: boolean;
  };
}) {
  const [state, action, pending] = useActionState<LibraryEditState, FormData>(
    adminEditLibraryAction,
    null
  );

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={defaults.id} />

      <Field label="Title">
        <input
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={200}
          defaultValue={defaults.title}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Category">
        <input
          name="category"
          type="text"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaults.category}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.description}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={defaults.isPublished}
          className="h-4 w-4 rounded"
        />
        <span>Published — visible to all members in /library</span>
      </label>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
