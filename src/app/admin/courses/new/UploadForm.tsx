"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminCreateCourseAction } from "@/app/actions/courses";

export default function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  function onThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return setThumbPreview(null);
    setThumbPreview(URL.createObjectURL(f));
  }

  // Read the video's duration in the browser using a hidden <video> element so
  // the listing/detail pages can show "12:34" without us re-probing the file.
  function readVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => {
        const dur = Number.isFinite(v.duration) ? Math.round(v.duration) : null;
        URL.revokeObjectURL(url);
        resolve(dur);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setProgress({ stage: "Starting…", pct: 0 });
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const video = data.get("video") as File | null;
    const thumb = data.get("thumbnail") as File | null;

    if (!video || video.size === 0) {
      setError("Pick a video to upload.");
      setPending(false);
      setProgress(null);
      return;
    }

    try {
      const durationSec = await readVideoDuration(video);

      let thumbnailUrl = "";
      let thumbnailPathname = "";
      if (thumb && thumb.size > 0) {
        setProgress({ stage: "Uploading thumbnail…", pct: 0 });
        const t = await upload(`thumbnails/${thumb.name}`, thumb, {
          access: "public",
          handleUploadUrl: "/api/courses/upload",
          onUploadProgress: ({ percentage }) =>
            setProgress({ stage: "Uploading thumbnail…", pct: Math.round(percentage) }),
        });
        thumbnailUrl = t.url;
        thumbnailPathname = t.pathname;
      }

      setProgress({ stage: "Uploading video…", pct: 0 });
      const blob = await upload(video.name, video, {
        access: "public",
        handleUploadUrl: "/api/courses/upload",
        onUploadProgress: ({ percentage }) =>
          setProgress({ stage: "Uploading video…", pct: Math.round(percentage) }),
      });

      setProgress({ stage: "Saving…", pct: 100 });
      const meta = new FormData();
      meta.set("title", String(data.get("title") ?? ""));
      meta.set("description", String(data.get("description") ?? ""));
      meta.set("category", String(data.get("category") ?? ""));
      meta.set("isPublished", data.get("isPublished") === "on" ? "true" : "false");
      meta.set("videoUrl", blob.url);
      meta.set("videoPathname", blob.pathname);
      meta.set("videoFilename", video.name);
      meta.set("videoMimeType", video.type);
      meta.set("videoSizeBytes", String(video.size));
      if (durationSec) meta.set("durationSec", String(durationSec));
      if (thumbnailUrl) {
        meta.set("thumbnailUrl", thumbnailUrl);
        meta.set("thumbnailPathname", thumbnailPathname);
      }

      const result = await adminCreateCourseAction(null, meta);
      if (!result?.ok) {
        throw new Error(result?.error ?? "Failed to save course metadata");
      }

      router.push("/admin/courses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-5">
      <Field label="Title" hint="Shown to members on the course card.">
        <input
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Diabetic foot — full ulcer assessment walkthrough"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Category"
        hint="Group similar courses together. Free-form (e.g. 'Cardiology', 'Wound Care', 'USMLE Step 2 CK')."
      >
        <input
          name="category"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Wound Care"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Description"
        hint="What's covered, intended audience, prerequisites."
      >
        <textarea
          name="description"
          rows={4}
          maxLength={4000}
          placeholder="What will learners walk away knowing?"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Thumbnail image"
        hint="Optional. JPG / PNG / WebP. Recommended 16:9 aspect ratio."
      >
        <div className="mt-1 flex items-start gap-3">
          {thumbPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbPreview}
              alt="Thumbnail preview"
              className="h-20 w-36 rounded-md border border-zinc-300 object-cover dark:border-zinc-700"
            />
          )}
          <input
            name="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onThumbChange}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>
      </Field>

      <Field label="Video file" hint="MP4, WebM, OGG, MOV, or MKV. Up to 2 GB.">
        <input
          name="video"
          type="file"
          required
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mp4,.webm,.ogg,.mov,.mkv"
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 rounded" />
        <span>Published — visible to all members in /courses</span>
      </label>

      {progress !== null && pending && (
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/40">
          <div className="flex items-center justify-between text-xs font-medium text-blue-900 dark:text-blue-200">
            <span>{progress.stage}</span>
            <span>{progress.pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/50">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress.pct}%` }}
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
        {pending ? "Uploading…" : "Upload course"}
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
