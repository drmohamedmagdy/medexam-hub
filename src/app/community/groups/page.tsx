import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { joinPublicGroupAction, leaveGroupAction } from "@/app/actions/community";

export const metadata = { title: "Groups — MedExam Hub" };

export default async function GroupsPage() {
  const user = await requireUser();

  const [myGroups, publicGroups] = await Promise.all([
    prisma.group.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true, posts: true } } },
    }),
    prisma.group.findMany({
      where: {
        isPublic: true,
        members: { none: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/community" className="text-sm text-zinc-500 hover:text-blue-600">
            &larr; Community
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Private spaces for studying together. Public groups are visible here; private groups are invite-only.
          </p>
        </div>
        <Link
          href="/community/groups/new"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create group
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Your groups</h2>
        {myGroups.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            You haven&apos;t joined any groups yet. Browse public groups below or create your own.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {myGroups.map((g) => {
              const isOwner = g.ownerId === user.id;
              return (
                <li
                  key={g.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link
                    href={`/community/groups/${g.id}`}
                    className="block hover:text-blue-700"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold">
                        {g.isPublic ? "🌐" : "🔒"} {g.name}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {g._count.members} · {g._count.posts} posts
                      </span>
                    </div>
                    {g.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {g.description}
                      </p>
                    )}
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {isOwner && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        Owner
                      </span>
                    )}
                    {!isOwner && (
                      <form action={leaveGroupAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Leave
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Discover public groups</h2>
        {publicGroups.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No public groups yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {publicGroups.map((g) => (
              <li
                key={g.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/community/groups/${g.id}`} className="block hover:text-blue-700">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold">🌐 {g.name}</h3>
                    <span className="text-xs text-zinc-500">{g._count.members} members</span>
                  </div>
                  {g.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {g.description}
                    </p>
                  )}
                </Link>
                <form action={joinPublicGroupAction} className="mt-3">
                  <input type="hidden" name="id" value={g.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    Join group
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
