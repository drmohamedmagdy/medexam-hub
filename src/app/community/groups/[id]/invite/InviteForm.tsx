"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteToGroupAction, type InviteState } from "@/app/actions/community";
import type { Translations } from "@/lib/i18n";

type CommunityT = Translations["community"];

export default function InviteForm({
  groupId,
  t,
}: {
  groupId: string;
  t: CommunityT;
}) {
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
        {t.inviteFormLabel}
      </label>
      <textarea
        id="emails"
        name="emails"
        required
        rows={4}
        placeholder={t.inviteFormPlaceholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-xs text-zinc-500">{t.inviteFormHint}</p>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {(state.sent ?? 0) === 1
            ? t.inviteFormSentOne
            : t.inviteFormSentMany.replace("{n}", (state.sent ?? 0).toString())}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? t.inviteFormSending : t.inviteFormSubmit}
      </button>
    </form>
  );
}
