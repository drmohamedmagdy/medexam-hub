"use client";

import { upload } from "@vercel/blob/client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminClearLibraryCoverAction,
  adminEditLibraryAction,
  adminSetLibraryCoverAction,
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
    coverUrl: string | null;
  };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LibraryEditState, FormData>(
    adminEditLibraryAction,
    null
  );

  const [coverUrl, setCoverUrl] = useState<string | null>(defaults.coverUrl);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);

  async function uploadNewCover(file: File) {
    setCoverError(null);
    setCoverPending(true);
    setCoverProgress(0);
    try {
      const blob = await upload(`covers/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/library/upload",
        onUploadProgress: ({ percentage }) => setCoverProgress(Math.round(percentage)),
      });
      const fd = new FormData();
      fd.set("id", defaults.id);
      fd.set("coverUrl", blob.url);
      fd.set("coverPathname", blob.pathname);
      const res = await adminSetLibraryCoverAction(null, fd);
      if (!res?.ok) throw new Error(res?.error ?? "Failed to save cover");
      setCoverUrl(blob.url);
      router.refresh();
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Cover upload failed");
    } finally {
      setCoverPending(false);
      setCoverProgress(null);
    }
  }

  async function clearCover() {
    setCoverError(null);
    setCoverPending(true);
    try {
      const fd = new FormData();
      fd.set("id", defaults.id);
      await adminClearLibraryCoverAction(fd);
      setCoverUrl(null);
      router.refresh();
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Failed to remove cover");
    } finally {
      setCoverPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Cover section — separate flow because it uploads to Blob client-side */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Cover image</h2>
        <div className="mt-4 flex flex-wrap items-start gap-4">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Current cover"
              className="rounded-md border border-zinc-300 object-cover dark:border-zinc-700"
              style={{ width: 96, height: 128 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700"
              style={{ width: 96, height: 128 }}
            >
              No cover
            </div>
          )}
          <div className="min-w-0 flex-1">
            <label className="inline-block">
              <span className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                {coverUrl ? "Replace cover" : "Upload cover"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={coverPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadNewCover(f);
                }}
                className="hidden"
              />
            </label>
            {coverUrl && (
              <button
                type="button"
                onClick={clearCover}
                disabled={coverPending}
                className="ms-2 rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove cover
              </button>
            )}
            {coverProgress !== null && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${coverProgress}%` }}
                />
              </div>
            )}
            {coverError && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-400">{coverError}</p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              JPG, PNG, WebP. Recommended 3:4 portrait (e.g. 600 × 800).
            </p>
          </div>
        </div>
      </section>

      {/* Metadata form */}
      <form action={action} className="space-y-5">
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
    </div>
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
