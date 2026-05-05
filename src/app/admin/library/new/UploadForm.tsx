"use client";

import { useActionState } from "react";
import { adminUploadLibraryAction, type LibraryUploadState } from "@/app/actions/library";

export default function UploadForm() {
  const [state, action, pending] = useActionState<LibraryUploadState, FormData>(
    adminUploadLibraryAction,
    null
  );

  return (
    <form action={action} className="mt-6 space-y-5" encType="multipart/form-data">
      <Field label="Title" hint="Shown to members on the library card.">
        <input
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Cardiology high-yield notes"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Category" hint="Group similar resources together. Free-form (e.g. 'USMLE Step 1', 'Anatomy', 'Cardiology').">
        <input
          name="category"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Cardiology"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Description" hint="Optional. A short summary helps members decide whether to open it.">
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="What's inside, intended audience, source attribution…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="File" hint="PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), or text. Max 4 MB.">
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
      </Field>

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        ⚠️ <strong>4 MB upload limit</strong> on the current Vercel plan. To upload larger files
        (textbooks, full lecture decks), the option is to upgrade Vercel to Pro (50 MB) or migrate
        to Vercel Blob storage. Ping me about either when you&apos;re ready.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked
          className="h-4 w-4 rounded"
        />
        <span>Published — visible to all members in /library</span>
      </label>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload resource"}
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
