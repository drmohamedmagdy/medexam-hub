import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CommentForm from "./CommentForm";
import { deletePostAction } from "@/app/actions/community";

export const metadata = { title: "Post — MedExam Hub" };

const KIND_META = {
  POST: { label: "Post", emoji: "💬", classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200" },
  QUESTION: { label: "Question", emoji: "❓", classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200" },
  ARTICLE: { label: "Article", emoji: "📰", classes: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200" },
} as const;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      group: { select: { id: true, name: true, isPublic: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!post) redirect("/community");

  // If post is in a group, must be a member.
  if (post.groupId) {
    const m = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: post.groupId, userId: user.id } },
    });
    if (!m) redirect("/community");
  }

  const meta = KIND_META[post.kind];
  const authorLabel = post.author.name?.trim() || post.author.email.split("@")[0];
  const canDelete = post.author.id === user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={post.groupId ? `/community/groups/${post.groupId}` : "/community"}
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Back to {post.group?.name ?? "community"}
      </Link>

      <article className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${meta.classes}`}>
            {meta.emoji} {meta.label}
          </span>
          {post.group && (
            <Link
              href={`/community/groups/${post.group.id}`}
              className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {post.group.isPublic ? "🌐" : "🔒"} {post.group.name}
            </Link>
          )}
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{authorLabel}</span>{" "}
            · {post.createdAt.toLocaleString()}
          </span>
          {canDelete && (
            <form action={deletePostAction} className="ml-auto">
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" className="text-xs text-red-600 hover:underline">
                Delete post
              </button>
            </form>
          )}
        </div>

        {post.title && (
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {post.title}
          </h1>
        )}

        <div className="prose prose-zinc mt-4 max-w-none whitespace-pre-wrap text-base leading-relaxed text-zinc-700 dark:prose-invert dark:text-zinc-200">
          {post.body}
        </div>

        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            className="mt-5 rounded-lg border border-zinc-200 dark:border-zinc-700"
          />
        )}

        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-cyan-300 dark:hover:bg-zinc-800"
          >
            🔗 {post.linkLabel ?? new URL(post.linkUrl).hostname}
          </a>
        )}
      </article>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">
          {post.comments.length} {post.kind === "QUESTION"
            ? (post.comments.length === 1 ? "answer" : "answers")
            : (post.comments.length === 1 ? "comment" : "comments")}
        </h2>

        <CommentForm postId={post.id} placeholder={post.kind === "QUESTION" ? "Share your answer…" : "Add a comment…"} />

        <ul className="mt-4 space-y-3">
          {post.comments.map((c) => {
            const cAuthor = c.author.name?.trim() || c.author.email.split("@")[0];
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{cAuthor}</span>
                  <span className="text-zinc-500">{c.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
