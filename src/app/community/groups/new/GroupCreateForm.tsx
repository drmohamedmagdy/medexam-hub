"use client";

import { useActionState } from "react";
import { createGroupAction, type CreateGroupState } from "@/app/actions/community";

export default function GroupCreateForm() {
  const [state, action, pending] = useActionState<CreateGroupState, FormData>(
    createGroupAction,
    null
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Cairo Cardiology Study Group"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="text-xs text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="What's the group for? Who should join?"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <fieldset className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
        <legend className="px-1 text-xs font-medium text-zinc-500">Visibility</legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-white dark:hover:bg-zinc-800">
          <input type="radio" name="isPublic" value="true" className="mt-1 h-4 w-4" />
          <span>
            <span className="block text-sm font-medium">🌐 Public</span>
            <span className="block text-xs text-zinc-500">Anyone signed in can find and join.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-white dark:hover:bg-zinc-800">
          <input
            type="radio"
            name="isPublic"
            value="false"
            defaultChecked
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">🔒 Private</span>
            <span className="block text-xs text-zinc-500">
              Invite-only. Members join via emailed link or invitation.
            </span>
          </span>
        </label>
      </fieldset>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
