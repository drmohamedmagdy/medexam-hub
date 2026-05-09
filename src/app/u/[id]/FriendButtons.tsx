"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendshipAction,
  type FriendActionState,
} from "@/app/actions/friendship";
import type { FriendshipState } from "@/lib/friendship";

export default function FriendButtons({
  targetUserId,
  state,
}: {
  targetUserId: string;
  state: FriendshipState;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sendState, sendAction, sending] = useActionState<FriendActionState, FormData>(
    sendFriendRequestAction,
    null
  );

  if (sendState?.ok) {
    setOpen(false);
    router.refresh();
  }

  if (state === "friends") {
    return (
      <form action={removeFriendshipAction}>
        <input type="hidden" name="otherUserId" value={targetUserId} />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          title="Click to unfriend"
        >
          ✓ Friends
        </button>
      </form>
    );
  }

  if (state === "request_sent") {
    return (
      <span className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        ⏳ Request sent
      </span>
    );
  }

  if (state === "request_received") {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={acceptFriendRequestAction}>
          <input type="hidden" name="otherUserId" value={targetUserId} />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ✅ Accept
          </button>
        </form>
        <form action={rejectFriendRequestAction}>
          <input type="hidden" name="otherUserId" value={targetUserId} />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Decline
          </button>
        </form>
      </div>
    );
  }

  // none / rejected — show send-request button (and a small "rejected"
  // hint if applicable).
  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
        >
          🤝 Add friend
        </button>
        {state === "rejected" && (
          <span className="self-center text-xs text-zinc-500">
            Previous request declined
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      action={sendAction}
      className="w-full rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <label className="block text-xs">
        <span className="block font-medium">Optional note</span>
        <textarea
          name="message"
          rows={2}
          maxLength={500}
          placeholder="Hi! We took the diabetic foot exam together…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
        />
      </label>
      {sendState && !sendState.ok && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {sendState.error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
