"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sendMessageAction,
  type SendMessageState,
} from "@/app/actions/messages";

export default function MessageThreadComposer({
  receiverId,
}: {
  receiverId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SendMessageState, FormData>(
    sendMessageAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={action}
      className="sticky bottom-0 mt-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="receiverId" value={receiverId} />
      <textarea
        name="body"
        required
        rows={2}
        maxLength={5000}
        placeholder="Type a message…"
        className="w-full resize-none rounded-md border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">
          ⏎ to send · Shift+⏎ for new line
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state && !state.ok && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
