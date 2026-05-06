"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { createPostAction, type CreatePostState } from "@/app/actions/community";
import type { Translations } from "@/lib/i18n";

type Kind = "POST" | "QUESTION" | "ARTICLE";

type CommunityT = Translations["community"];

export default function ComposeBox({
  groupId,
  userName,
  t,
}: {
  groupId?: string;
  userName?: string;
  t: CommunityT;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("POST");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePathname, setImagePathname] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [state, action, pending] = useActionState<CreatePostState, FormData>(
    createPostAction,
    null
  );

  const KIND_OPTIONS: { value: Kind; label: string; emoji: string; hint: string }[] = [
    { value: "POST", label: t.kindPost, emoji: "💬", hint: t.kindPostHint },
    { value: "QUESTION", label: t.kindQuestion, emoji: "❓", hint: t.kindQuestionHint },
    { value: "ARTICLE", label: t.kindArticle, emoji: "📰", hint: t.kindArticleHint },
  ];

  if (state?.ok) {
    // Reset & refresh after a successful submission.
    if (open) {
      setOpen(false);
      setKind("POST");
      setImageUrl(null);
      setImagePathname(null);
      setImagePreview(null);
      router.refresh();
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setProgress(0);
    try {
      const blob = await upload(`community/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/community/upload",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      setImageUrl(blob.url);
      setImagePathname(blob.pathname);
    } catch {
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    const prompt = userName
      ? t.composePromptUser.replace("{name}", userName)
      : t.composePromptAnonymous;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-start text-sm text-zinc-500 transition hover:border-blue-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60 dark:hover:bg-zinc-800/60"
      >
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{prompt}</span>
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-2xl border border-blue-300 bg-white p-4 shadow-md dark:border-cyan-700/60 dark:bg-zinc-900 sm:p-5"
    >
      <input type="hidden" name="kind" value={kind} />
      {groupId && <input type="hidden" name="groupId" value={groupId} />}
      {imageUrl && imagePathname && (
        <>
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <input type="hidden" name="imagePathname" value={imagePathname} />
        </>
      )}

      {/* Kind picker */}
      <div className="flex flex-wrap gap-2">
        {KIND_OPTIONS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              kind === k.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {k.emoji} {k.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500">{KIND_OPTIONS.find((k) => k.value === kind)?.hint}</span>
      </div>

      {kind !== "POST" && (
        <input
          name="title"
          required
          maxLength={200}
          placeholder={kind === "QUESTION" ? t.composeQuestionTitle : t.composeArticleTitle}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-medium dark:border-zinc-700 dark:bg-zinc-900"
        />
      )}

      <textarea
        name="body"
        required
        rows={kind === "ARTICLE" ? 10 : 4}
        maxLength={20_000}
        placeholder={
          kind === "QUESTION"
            ? t.composeQuestionBody
            : kind === "ARTICLE"
              ? t.composeArticleBody
              : t.composePostBody
        }
        className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
      />

      {/* Optional link */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          name="linkUrl"
          type="url"
          placeholder={t.composeLinkUrlPlaceholder}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="linkLabel"
          maxLength={120}
          placeholder={t.composeLinkLabelPlaceholder}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {/* Image upload */}
      <div className="mt-3">
        {imagePreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="preview"
              className="max-h-60 w-auto rounded-lg border border-zinc-300 dark:border-zinc-700"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-sm font-medium text-white">
                {t.composeUploading.replace("{pct}", progress.toString())}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                setImageUrl(null);
                setImagePathname(null);
              }}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              {t.composeRemoveImage}
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:bg-zinc-800">
            {t.composeAddImage}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onPickImage}
              className="hidden"
            />
          </label>
        )}
      </div>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {t.composeCancel}
        </button>
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? t.composePosting : t.composePost}
        </button>
      </div>
    </form>
  );
}
