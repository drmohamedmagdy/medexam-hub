import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Explore profiles — MedExam Hub" };

export default async function ExploreProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  type WhereFilter = NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"];
  const where: WhereFilter = {
    // Only show users who chose to be public AND aren't the current viewer.
    profilePublic: true,
    NOT: { id: me.id },
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      plan: true,
      _count: { select: { exams: true, posts: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Explore profiles
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Find and message other MedExam Hub users.
        </p>
      </header>

      <form className="mt-6 flex flex-wrap items-center gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name, email, or bio…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Search
        </button>
        {q && (
          <Link
            href="/u"
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700"
          >
            Reset
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {q
            ? `No profiles match "${q}". Try a different search.`
            : "No public profiles to show yet."}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const name = u.name?.trim() || u.email.split("@")[0];
            const initial = (u.name?.[0] ?? u.email[0]).toUpperCase();
            return (
              <li
                key={u.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
              >
                <Link
                  href={`/u/${u.id}`}
                  className="flex items-start gap-3"
                >
                  {u.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.avatarUrl}
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
                    {u.bio && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {u.bio}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                      <span>{u._count.exams} exams</span>
                      <span>{u._count.posts} posts</span>
                    </div>
                  </div>
                </Link>

                <div className="mt-3 flex justify-end gap-2">
                  <Link
                    href={`/messages/${u.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    ✉️ Message
                  </Link>
                  <Link
                    href={`/u/${u.id}`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    View →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
