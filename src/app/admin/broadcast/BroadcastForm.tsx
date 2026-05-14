"use client";

import { useActionState, useState } from "react";
import {
  sendBroadcastAction,
  type BroadcastState,
} from "@/app/actions/broadcast";

export default function BroadcastForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<BroadcastState, FormData>(
    sendBroadcastAction,
    null
  );
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const charLimit = imageUrl ? 1024 : 3800;
  const overLimit = text.length > charLimit;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium">
            Message <span className="text-red-600">*</span>
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            HTML allowed: <code>&lt;b&gt;bold&lt;/b&gt;</code>,{" "}
            <code>&lt;i&gt;italic&lt;/i&gt;</code>,{" "}
            <code>&lt;a href=&quot;https://…&quot;&gt;link&lt;/a&gt;</code>,{" "}
            <code>&lt;code&gt;code&lt;/code&gt;</code>. Other tags break the post.
          </p>
          <textarea
            id="text"
            name="text"
            rows={8}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's the most likely diagnosis? &#10;&#10;A 65-year-old man presents with…"
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm font-mono dark:bg-zinc-950 ${
              overLimit
                ? "border-red-400 dark:border-red-700"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          />
          <p className={`mt-1 text-xs ${overLimit ? "text-red-600" : "text-zinc-500"}`}>
            {text.length} / {charLimit} chars
            {imageUrl && " (caption mode — Telegram caps captions at 1024)"}
          </p>
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium">
            Image URL (optional)
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Direct https:// link to a JPG/PNG. If set, message becomes the photo caption.
          </p>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ctaLabel" className="block text-sm font-medium">
              Button label (optional)
            </label>
            <input
              id="ctaLabel"
              name="ctaLabel"
              type="text"
              maxLength={64}
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Try MedExam Hub →"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label htmlFor="ctaUrl" className="block text-sm font-medium">
              Button link
            </label>
            <input
              id="ctaUrl"
              name="ctaUrl"
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://medexamhub.org/plans"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        {state && !state.ok && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            ✗ {state.error}
          </p>
        )}
        {state && state.ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            ✓ Posted to the channel (Telegram message #{state.messageId}).
          </p>
        )}

        <button
          type="submit"
          disabled={pending || disabled || overLimit || text.length < 2}
          className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post to Telegram channel"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          This goes live in the channel immediately. Double-check the
          message before submitting.
        </p>
      </form>

      <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-800/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Preview
        </p>
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="mb-3 max-h-60 w-full rounded-md object-cover"
            />
          )}
          <div
            className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200"
            // eslint-disable-next-line react/no-danger -- admin-only, no XSS path
            dangerouslySetInnerHTML={{
              __html: text || '<span class="text-zinc-400">Type a message →</span>',
            }}
          />
          {ctaLabel && ctaUrl && (
            <div className="mt-3 rounded-md bg-blue-50 px-4 py-2 text-center text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {ctaLabel}
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Approximation of how the post will look. Telegram renders HTML
          and shows the button as a real tap target.
        </p>
      </aside>
    </div>
  );
}
