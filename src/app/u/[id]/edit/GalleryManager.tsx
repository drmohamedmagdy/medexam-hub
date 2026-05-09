"use client";

import { useActionState, useEffect, useState } from "react";
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
  originalName: string | null;
};

type PendingBlob = {
  url: string;
  pathname: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  isFile: boolean;
};

const MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const FILE_ACCEPT =
  "application/pdf," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-powerpoint," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "text/plain,text/csv,text/markdown,application/zip";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileEmoji(mime: string, name: string) {
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "📕";
  if (mime.includes("word") || /\.docx?$/i.test(name)) return "📄";
  if (mime.includes("presentation") || /\.pptx?$/i.test(name)) return "📊";
  if (mime.includes("sheet") || mime.includes("excel") || /\.xlsx?$/i.test(name)) return "📈";
  if (mime.startsWith("text/") || /\.(md|txt|csv)$/i.test(name)) return "📝";
  if (mime === "application/zip" || /\.zip$/i.test(name)) return "🗜️";
  return "📎";
}

export default function GalleryManager({ media }: { media: MediaItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<PendingBlob | null>(null);
  const [caption, setCaption] = useState("");
  const [state, action, addPending] = useActionState<MediaState, FormData>(
    addProfileMediaAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      setPendingBlob(null);
      setCaption("");
      router.refresh();
    }
  }, [state, router]);

  async function uploadFile(file: File, isFile: boolean) {
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
        originalName: file.name,
        isFile,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  async function onPickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, false);
    e.target.value = "";
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, true);
    e.target.value = "";
  }

  const mediaItems = media.filter((m) => m.kind === "image" || m.kind === "video");
  const fileItems = media.filter((m) => m.kind === "file");

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Gallery & files
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Up to 30 items combined. Max 50 MB each. Friends see everything;
        non-friends see nothing here unless your profile is public.
      </p>

      {/* Upload row — two distinct buttons */}
      <div className="mt-4">
        {!pendingBlob ? (
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
              {pending ? "Uploading…" : "🖼️  Add image or video"}
              <input
                type="file"
                accept={MEDIA_ACCEPT}
                onChange={onPickMedia}
                disabled={pending}
                className="sr-only"
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300">
              {pending ? "Uploading…" : "📎 Add file (PDF, DOCX…)"}
              <input
                type="file"
                accept={FILE_ACCEPT}
                onChange={onPickFile}
                disabled={pending}
                className="sr-only"
              />
            </label>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="url" value={pendingBlob.url} />
            <input type="hidden" name="pathname" value={pendingBlob.pathname} />
            <input type="hidden" name="mimeType" value={pendingBlob.mimeType} />
            <input type="hidden" name="sizeBytes" value={String(pendingBlob.sizeBytes)} />
            <input type="hidden" name="originalName" value={pendingBlob.originalName} />
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
              {pendingBlob.isFile ? (
                <div className="flex items-center gap-3 p-4 text-sm">
                  <span className="text-2xl">
                    {fileEmoji(pendingBlob.mimeType, pendingBlob.originalName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pendingBlob.originalName}</div>
                    <div className="text-xs text-zinc-500">
                      {formatSize(pendingBlob.sizeBytes)} · {pendingBlob.mimeType}
                    </div>
                  </div>
                </div>
              ) : pendingBlob.mimeType.startsWith("video/") ? (
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
              placeholder={pendingBlob.isFile ? "Optional description (e.g. \"Wound care notes\")" : "Optional caption"}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={addPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {addPending ? "Adding…" : pendingBlob.isFile ? "Add file" : "Add to gallery"}
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

      {mediaItems.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Images & videos
          </h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {mediaItems.map((m) => (
              <li
                key={m.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                {m.kind === "video" ? (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video src={m.url} controls className="aspect-video w-full" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.url}
                    alt={m.caption ?? ""}
                    className="aspect-video w-full object-cover"
                  />
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
        </>
      )}

      {fileItems.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Files
          </h3>
          <ul className="mt-2 space-y-2">
            {fileItems.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <span className="text-2xl">
                  {fileEmoji(m.mimeType, m.originalName ?? "")}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={m.originalName ?? undefined}
                    className="block truncate font-medium hover:text-blue-600 dark:hover:text-cyan-400"
                  >
                    {m.originalName ?? "Untitled file"}
                  </a>
                  {m.caption && (
                    <p className="truncate text-xs text-zinc-500">{m.caption}</p>
                  )}
                </div>
                <form action={removeProfileMediaAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-md text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
