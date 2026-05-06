import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import PostCard from "./PostCard";
import ComposeBox from "./ComposeBox";

export const metadata = { title: "Community — MedExam Hub" };

export default async function CommunityPage() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale).community;

  const [feed, myGroups, popularGroups] = await Promise.all([
    prisma.post.findMany({
      where: { groupId: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.group.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        isPublic: true,
        _count: { select: { members: true, posts: true } },
      },
    }),
    prisma.group.findMany({
      where: {
        isPublic: true,
        members: { none: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { members: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1fr_18rem] lg:gap-8">
        {/* Main column */}
        <main>
          <header className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
          </header>

          <ComposeBox userName={user.name ?? user.email.split("@")[0]} t={t} />

          {feed.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              {t.emptyFeed}
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {feed.map((p) => (
                <li key={p.id}>
                  <PostCard
                    post={{
                      id: p.id,
                      kind: p.kind,
                      title: p.title,
                      body: p.body,
                      imageUrl: p.imageUrl,
                      linkUrl: p.linkUrl,
                      linkLabel: p.linkLabel,
                      createdAt: p.createdAt,
                      author: p.author,
                      commentCount: p._count.comments,
                    }}
                    canDelete={p.author.id === user.id}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          )}
        </main>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t.yourGroupsHeading}</h2>
              <Link
                href="/community/groups/new"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {t.newGroupShort}
              </Link>
            </div>
            {myGroups.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">{t.noGroupsYet}</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {myGroups.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/community/groups/${g.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span className="min-w-0 truncate">
                        {g.isPublic ? "🌐" : "🔒"} {g.name}
                      </span>
                      <span className="text-xs text-zinc-500">{g._count.members}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/community/groups"
              className="mt-3 block text-center text-xs font-medium text-blue-600 hover:underline"
            >
              {t.seeAllGroups}
            </Link>
          </div>

          {popularGroups.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold">{t.discoverHeading}</h2>
              <ul className="mt-3 space-y-2">
                {popularGroups.map((g) => {
                  const memberLabel =
                    g._count.members === 1
                      ? t.membersCountOne
                      : t.membersCountMany.replace("{n}", g._count.members.toString());
                  return (
                    <li key={g.id} className="text-sm">
                      <Link
                        href={`/community/groups/${g.id}`}
                        className="font-medium hover:text-blue-600"
                      >
                        🌐 {g.name}
                      </Link>
                      {g.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {g.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-zinc-500">{memberLabel}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
