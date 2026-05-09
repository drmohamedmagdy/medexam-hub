import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFriendshipState, getFriendIds } from "@/lib/friendship";
import {
  acceptFriendRequestAction,
  rejectFriendRequestAction,
} from "@/app/actions/friendship";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  });
  const label = u?.name?.trim() || u?.email.split("@")[0] || "Friends";
  return { title: `${label}'s friends — MedExam Hub` };
}

export default async function FriendsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, profilePublic: true },
  });
  if (!profile) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === profile.id;
  const friendship = me ? await getFriendshipState(me.id, profile.id) : "none";
  const canSeeFull = isMe || friendship === "friends";

  if (!canSeeFull) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={`/u/${profile.id}`}
          className="text-sm text-zinc-500 hover:text-blue-600"
        >
          &larr; Back to profile
        </Link>
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 Friend list is visible to friends only.
        </div>
      </div>
    );
  }

  const friendIds = await getFriendIds(profile.id);
  const friends = friendIds.length
    ? await prisma.user.findMany({
        where: { id: { in: friendIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, avatarUrl: true, bio: true },
      })
    : [];

  // Pending request lists are private to the profile owner. They never
  // appear when a friend (or anyone else) views your friends page.
  const pendingIncoming = isMe
    ? await prisma.friendship.findMany({
        where: {
          status: "pending",
          NOT: { requestedBy: profile.id },
          OR: [{ userAId: profile.id }, { userBId: profile.id }],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          requestedBy: true,
          message: true,
          createdAt: true,
        },
      })
    : [];
  const pendingOutgoing = isMe
    ? await prisma.friendship.findMany({
        where: {
          status: "pending",
          requestedBy: profile.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userAId: true,
          userBId: true,
          createdAt: true,
        },
      })
    : [];

  const incomingIds = pendingIncoming.map((r) => r.requestedBy);
  const outgoingIds = pendingOutgoing.map((r) =>
    r.userAId === profile.id ? r.userBId : r.userAId
  );
  const otherIds = Array.from(new Set([...incomingIds, ...outgoingIds]));
  const others = otherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })
    : [];
  const otherById = new Map(others.map((u) => [u.id, u]));

  const profileName = profile.name?.trim() || profile.email.split("@")[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/u/${profile.id}`}
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Back to {isMe ? "my profile" : `${profileName}'s profile`}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {isMe ? "My friends" : `${profileName}'s friends`}
        <span className="ml-2 text-base font-normal text-zinc-500">
          ({friends.length})
        </span>
      </h1>

      {isMe && pendingIncoming.length > 0 && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            🤝 Pending requests for you ({pendingIncoming.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {pendingIncoming.map((r) => {
              const other = otherById.get(r.requestedBy);
              if (!other) return null;
              const name = other.name?.trim() || other.email.split("@")[0];
              const initial = (other.name?.[0] ?? other.email[0]).toUpperCase();
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-white p-3 dark:bg-zinc-900"
                >
                  <Link
                    href={`/u/${other.id}`}
                    className="flex min-w-0 items-start gap-3 hover:opacity-90"
                  >
                    {other.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={other.avatarUrl}
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
                      <input
                        type="hidden"
                        name="otherUserId"
                        value={other.id}
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                    </form>
                    <form action={rejectFriendRequestAction}>
                      <input
                        type="hidden"
                        name="otherUserId"
                        value={other.id}
                      />
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
      )}

      {isMe && pendingOutgoing.length > 0 && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            ⏳ Requests you sent ({pendingOutgoing.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {pendingOutgoing.map((r) => {
              const otherId =
                r.userAId === profile.id ? r.userBId : r.userAId;
              const other = otherById.get(otherId);
              if (!other) return null;
              const name = other.name?.trim() || other.email.split("@")[0];
              const initial = (other.name?.[0] ?? other.email[0]).toUpperCase();
              return (
                <li key={r.id}>
                  <Link
                    href={`/u/${other.id}`}
                    className="flex items-center gap-3 rounded-md bg-zinc-50 p-3 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                  >
                    {other.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={other.avatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      <div className="text-xs text-zinc-500">
                        Sent {r.createdAt.toLocaleDateString()} · awaiting reply
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {isMe ? "Friends" : `${profileName}'s friends`}
        </h2>

        {friends.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
            {isMe ? (
              <>
                You don&apos;t have any friends yet —{" "}
                <Link
                  href="/u"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  explore profiles
                </Link>{" "}
                and send a friend request.
              </>
            ) : (
              <>{profileName} hasn&apos;t added any friends yet.</>
            )}
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {friends.map((f) => {
              const name = f.name?.trim() || f.email.split("@")[0];
              const initial = (f.name?.[0] ?? f.email[0]).toUpperCase();
              return (
                <li key={f.id}>
                  <Link
                    href={`/u/${f.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
                  >
                    {f.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={f.avatarUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      {f.bio && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {f.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
