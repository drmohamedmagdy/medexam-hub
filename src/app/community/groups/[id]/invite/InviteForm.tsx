"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteToGroupAction, type InviteState } from "@/app/actions/community";

export default function InviteForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteToGroupAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <label htmlFor="emails" className="block text-sm font-medium">
        Email addresses
      </label>
      <textarea
        id="emails"
        name="emails"
        required
        rows={4}
        placeholder="friend1@example.com, friend2@example.com&#10;Or paste one per line."
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-xs text-zinc-500">
        Separate multiple addresses with commas, semicolons, spaces, or new lines. Up to 50 at a time.
      </p>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ Sent {state.sent} invite{state.sent === 1 ? "" : "s"}.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invites"}
      </button>
    </form>
  );
}
