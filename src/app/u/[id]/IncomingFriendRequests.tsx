import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  acceptFriendRequestAction,
  rejectFriendRequestAction,
} from "@/app/actions/friendship";

export default async function IncomingFriendRequests({
  userId,
}: {
  userId: string;
}) {
  // Pending rows where I'm one side AND the other person is the requester.
  const rows = await prisma.friendship.findMany({
    where: {
      status: "pending",
      NOT: { requestedBy: userId },
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requestedBy: true,
      message: true,
      createdAt: true,
      userAId: true,
      userBId: true,
    },
  });
  if (rows.length === 0) return null;

  const requesterIds = rows.map((r) => r.requestedBy);
  const requesters = await prisma.user.findMany({
    where: { id: { in: requesterIds } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  const byId = new Map(requesters.map((u) => [u.id, u]));

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        🤝 Pending friend requests ({rows.length})
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const requester = byId.get(r.requestedBy);
          if (!requester) return null;
          const name =
            requester.name?.trim() || requester.email.split("@")[0];
          const initial = (requester.name?.[0] ?? requester.email[0]).toUpperCase();
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-white p-3 dark:bg-zinc-900"
            >
              <Link
                href={`/u/${requester.id}`}
                className="flex min-w-0 items-start gap-3 hover:opacity-90"
              >
                {requester.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={requester.avatarUrl}
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
                    {r.createdAt.toLocaleString()}
                  </div>
                  {r.message && (
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      “{r.message}”
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex shrink-0 gap-2">
                <form action={acceptFriendRequestAction}>
                  <input type="hidden" name="otherUserId" value={requester.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Accept
                  </button>
                </form>
                <form action={rejectFriendRequestAction}>
                  <input type="hidden" name="otherUserId" value={requester.id} />
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
