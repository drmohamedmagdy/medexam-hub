"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestJoinGroupAction,
  type RequestState,
} from "@/app/actions/group-requests";

export default function RequestJoinPanel({
  groupId,
  existingStatus,
}: {
  groupId: string;
  existingStatus: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RequestState, FormData>(
    requestJoinGroupAction,
    null
  );

  if (state?.ok) {
    router.refresh();
  }

  if (existingStatus === "pending") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        ⏳ Your join request is pending. The owner will be notified.
      </div>
    );
  }
  if (existingStatus === "rejected") {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        Your previous request to join this group was declined.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-2 font-medium underline"
        >
          Request again
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        🤝 Request to join
      </button>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-zinc-200 bg-white p-4 text-start dark:border-zinc-800 dark:bg-zinc-900">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="block text-sm">
        <span className="block font-medium">Optional note to the owner</span>
        <textarea
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Hi, I'd love to join because…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
        />
      </label>
      {state && !state.ok && state.error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send request"}
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
