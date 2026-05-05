"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminCreateLibraryRecordAction } from "@/app/actions/library";

export default function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setProgress(0);
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Pick a file to upload.");
      setPending(false);
      setProgress(null);
      return;
    }

    try {
      // 1. Upload directly from the browser to Vercel Blob, bypassing our
      //    serverless function entirely. The /api/library/upload route only
      //    issues a short-lived signed token after verifying the caller is
      //    an admin — it never sees the file body.
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/library/upload",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

      // 2. Save the metadata row in our DB (just text fields + the blob URL).
      const meta = new FormData();
      meta.set("title", String(data.get("title") ?? ""));
      meta.set("description", String(data.get("description") ?? ""));
      meta.set("category", String(data.get("category") ?? ""));
      const isPublished = (data.get("isPublished") === "on") ? "true" : "false";
      meta.set("isPublished", isPublished);
      meta.set("fileUrl", blob.url);
      meta.set("filePathname", blob.pathname);
      meta.set("filename", file.name);
      meta.set("mimeType", file.type);
      meta.set("sizeBytes", String(file.size));

      const result = await adminCreateLibraryRecordAction(null, meta);
      if (!result?.ok) {
        throw new Error(result?.error ?? "Failed to save resource metadata");
      }

      // 3. Done — back to the library list
      router.push("/admin/library");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-5">
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

      <Field
        label="Category"
        hint="Group similar resources together. Free-form (e.g. 'USMLE Step 1', 'Anatomy', 'Cardiology')."
      >
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

      <Field
        label="Description"
        hint="Optional. A short summary helps members decide whether to open it."
      >
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="What's inside, intended audience, source attribution…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="File"
        hint="PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), or text. Up to 100 MB."
      >
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 rounded" />
        <span>Published — visible to all members in /library</span>
      </label>

      {progress !== null && pending && (
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/40">
          <div className="flex items-center justify-between text-xs font-medium text-blue-900 dark:text-blue-200">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/50">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
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
