import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PostCard from "../../PostCard";
import ComposeBox from "../../ComposeBox";
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
  const user = await requireUser();

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

  // Private groups: only members can see posts.
  if (!isMember && !group.isPublic) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">🔒 {group.name}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This is a private group. You need an invite from {group.owner.name?.split(" ")[0] ?? "the owner"} to join.
        </p>
        <Link
          href="/community/groups"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back to groups
        </Link>
      </div>
    );
  }

  const posts = await prisma.post.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/community/groups" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Groups
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
              Owned by{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {group.owner.name ?? group.owner.email.split("@")[0]}
              </span>{" "}
              · {group._count.members} member{group._count.members === 1 ? "" : "s"} ·{" "}
              {group._count.posts} post{group._count.posts === 1 ? "" : "s"}
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
                  Join group
                </button>
              </form>
            )}
            {(isOwner || (isMember && membership?.role === "admin")) && (
              <Link
                href={`/community/groups/${group.id}/invite`}
                className="rounded-md border border-blue-600 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                + Invite by email
              </Link>
            )}
            {isMember && !isOwner && (
              <form action={leaveGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Leave
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
                  title={group.isPublic ? "Make this group invite-only" : "Make this group discoverable to all members"}
                >
                  {group.isPublic ? "Make private 🔒" : "Make public 🌐"}
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
                  Delete group
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {canPost && (
        <div className="mt-5">
          <ComposeBox groupId={group.id} userName={user.name ?? user.email.split("@")[0]} />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No posts in this group yet.
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
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
