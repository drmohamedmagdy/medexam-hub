"use client";

import {
  approveJoinRequestAction,
  rejectJoinRequestAction,
} from "@/app/actions/group-requests";

type PendingRequest = {
  id: string;
  createdAt: string;
  message: string | null;
  requester: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

export default function PendingRequestsList({
  requests,
}: {
  requests: PendingRequest[];
}) {
  return (
    <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        🤝 Pending join requests ({requests.length})
      </h2>
      <ul className="mt-3 space-y-2">
        {requests.map((r) => {
          const name =
            r.requester.name?.trim() || r.requester.email.split("@")[0];
          const initial = (
            r.requester.name?.[0] ?? r.requester.email[0]
          ).toUpperCase();
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-white p-3 dark:bg-zinc-900"
            >
              <div className="flex min-w-0 items-start gap-3">
                {r.requester.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={r.requester.avatarUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                    {initial}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-zinc-500">
                    Sent {new Date(r.createdAt).toLocaleString()}
                  </div>
                  {r.message && (
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      “{r.message}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={approveJoinRequestAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectJoinRequestAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Decline
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
