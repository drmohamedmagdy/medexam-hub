import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import PostCard from "../../PostCard";
import ComposeBox from "../../ComposeBox";
import RequestJoinPanel from "./RequestJoinPanel";
import PendingRequestsList from "./PendingRequestsList";
import {
  joinPublicGroupAction,
  leaveGroupAction,
  deleteGroupAction,
  setGroupVisibilityAction,
} from "@/app/actions/community";

export const metadata = { title: "Group — MedExam Hub" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale).community;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, posts: true } },
    },
  });
  if (!group) redirect("/community/groups");

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  const isMember = !!membership;
  const isOwner = group.ownerId === user.id;
  const canPost = isMember;

  // Private groups: only members can see posts. Non-members can request
  // to join — the owner gets a notification and can approve/reject from
  // the group page.
  if (!isMember && !group.isPublic) {
    const ownerName = group.owner.name?.split(" ")[0] ?? group.owner.email.split("@")[0];
    const myRequest = await prisma.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
      select: { status: true, createdAt: true },
    });
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">{t.groupPrivateLockedTitle.replace("{name}", group.name)}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {t.groupPrivateLockedBody.replace("{owner}", ownerName)}
        </p>

        <div className="mt-6">
          <RequestJoinPanel groupId={group.id} existingStatus={myRequest?.status ?? null} />
        </div>

        <Link
          href="/community/groups"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {t.groupBackToGroups}
        </Link>
      </div>
    );
  }

  // Owner-side: pending join requests to approve / reject.
  const pendingRequests = isOwner
    ? await prisma.groupJoinRequest.findMany({
        where: { groupId: id, status: "pending" },
        orderBy: { createdAt: "asc" },
        include: {
          requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      })
    : [];

  const posts = await prisma.post.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  const ownerLabel = group.owner.name ?? group.owner.email.split("@")[0];
  const memberLabel =
    group._count.members === 1
      ? t.membersCountOne
      : t.membersCountMany.replace("{n}", group._count.members.toString());
  const postsLabel = t.groupsPostsCount.replace("{n}", group._count.posts.toString());

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/community/groups" className="text-sm text-zinc-500 hover:text-blue-600">
        {t.groupBack}
      </Link>

      <header className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {group.isPublic ? "🌐" : "🔒"} {group.name}
            </h1>
            {group.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {group.description}
              </p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              {t.groupOwnedBy.replace("{name}", ownerLabel)} · {memberLabel} · {postsLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {!isMember && group.isPublic && (
              <form action={joinPublicGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                >
                  {t.groupsJoinBtn}
                </button>
              </form>
            )}
            {(isOwner || (isMember && membership?.role === "admin")) && (
              <Link
                href={`/community/groups/${group.id}/invite`}
                className="rounded-md border border-blue-600 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                {t.groupInviteBtn}
              </Link>
            )}
            {isMember && !isOwner && (
              <form action={leaveGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {t.groupsLeaveBtn}
                </button>
              </form>
            )}
            {isOwner && (
              <form action={setGroupVisibilityAction}>
                <input type="hidden" name="id" value={group.id} />
                <input type="hidden" name="isPublic" value={group.isPublic ? "false" : "true"} />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title={group.isPublic ? t.groupMakePrivateTitle : t.groupMakePublicTitle}
                >
                  {group.isPublic ? t.groupMakePrivate : t.groupMakePublic}
                </button>
              </form>
            )}
            {isOwner && (
              <form action={deleteGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                >
                  {t.groupDeleteBtn}
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {isOwner && pendingRequests.length > 0 && (
        <PendingRequestsList
          requests={pendingRequests.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            message: r.message,
            requester: {
              id: r.requester.id,
              name: r.requester.name,
              email: r.requester.email,
              avatarUrl: r.requester.avatarUrl,
            },
          }))}
        />
      )}

      {canPost && (
        <div className="mt-5">
          <ComposeBox
            groupId={group.id}
            userName={user.name ?? user.email.split("@")[0]}
            t={t}
          />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {t.groupNoPostsYet}
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {posts.map((p) => (
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
                canDelete={p.author.id === user.id || isOwner}
                t={t}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
