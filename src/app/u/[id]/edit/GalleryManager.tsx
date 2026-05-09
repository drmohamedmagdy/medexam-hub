"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  addProfileMediaAction,
  removeProfileMediaAction,
  type MediaState,
} from "@/app/actions/profile-media";

type MediaItem = {
  id: string;
  kind: string;
  url: string;
  caption: string | null;
  mimeType: string;
};

export default function GalleryManager({ media }: { media: MediaItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<{
    url: string;
    pathname: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [state, action, addPending] = useActionState<MediaState, FormData>(
    addProfileMediaAction,
    null
  );

  if (state?.ok) {
    setPendingBlob(null);
    setCaption("");
    router.refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setPending(true);
    setProgress({ name: file.name, pct: 0 });
    try {
      const blob = await upload(`profile-media/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/profile/media",
        onUploadProgress: ({ percentage }) =>
          setProgress({ name: file.name, pct: Math.round(percentage) }),
      });
      setPendingBlob({
        url: blob.url,
        pathname: blob.pathname,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
      setProgress(null);
      e.target.value = "";
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Gallery
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Up to 30 images or short videos. Max 50 MB each. Anyone who can see
        your profile sees the gallery.
      </p>

      {/* Upload */}
      <div className="mt-4">
        {!pendingBlob ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
            {pending ? "Uploading…" : "+ Add image or video"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={onPickFile}
              disabled={pending}
              className="sr-only"
            />
          </label>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="url" value={pendingBlob.url} />
            <input type="hidden" name="pathname" value={pendingBlob.pathname} />
            <input type="hidden" name="mimeType" value={pendingBlob.mimeType} />
            <input type="hidden" name="sizeBytes" value={String(pendingBlob.sizeBytes)} />
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
              {pendingBlob.mimeType.startsWith("video/") ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video src={pendingBlob.url} controls className="aspect-video w-full" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={pendingBlob.url} alt="" className="aspect-video w-full object-cover" />
              )}
            </div>
            <input
              type="text"
              name="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
              placeholder="Optional caption"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={addPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {addPending ? "Adding…" : "Add to gallery"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingBlob(null);
                  setCaption("");
                }}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {progress && (
          <p className="mt-2 text-xs text-zinc-500">
            Uploading {progress.name} — {progress.pct}%
          </p>
        )}
        {uploadError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {uploadError}
          </p>
        )}
        {state?.error && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
      </div>

      {/* Existing items */}
      {media.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {media.map((m) => (
            <li
              key={m.id}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              {m.kind === "video" ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video src={m.url} controls className="aspect-video w-full" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.url} alt={m.caption ?? ""} className="aspect-video w-full object-cover" />
              )}
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="truncate text-zinc-600 dark:text-zinc-400">
                  {m.caption ?? "No caption"}
                </span>
                <form action={removeProfileMediaAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
