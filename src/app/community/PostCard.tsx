import Link from "next/link";
import { deletePostAction } from "@/app/actions/community";

type PostCardData = {
  id: string;
  kind: "POST" | "QUESTION" | "ARTICLE";
  title: string | null;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  createdAt: Date;
  author: { id: string; name: string | null; email: string };
  commentCount: number;
};

const KIND_META: Record<PostCardData["kind"], { label: string; classes: string; emoji: string }> = {
  POST: {
    label: "Post",
    emoji: "💬",
    classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
  QUESTION: {
    label: "Question",
    emoji: "❓",
    classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  ARTICLE: {
    label: "Article",
    emoji: "📰",
    classes: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  },
};

export default function PostCard({
  post,
  canDelete,
}: {
  post: PostCardData;
  canDelete?: boolean;
}) {
  const meta = KIND_META[post.kind];
  const authorLabel = post.author.name?.trim() || post.author.email.split("@")[0];
  const dateLabel = post.createdAt.toLocaleString();

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${meta.classes}`}>
          {meta.emoji} {meta.label}
        </span>
        <span className="text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{authorLabel}</span> ·{" "}
          {dateLabel}
        </span>
        {canDelete && (
          <form action={deletePostAction} className="ml-auto">
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline"
              aria-label="Delete this post"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      <Link href={`/community/post/${post.id}`} className="mt-3 block">
        {post.title && (
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-blue-700 dark:text-zinc-100 dark:hover:text-cyan-300 sm:text-xl">
            {post.title}
          </h2>
        )}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 line-clamp-6">
          {post.body}
        </p>
      </Link>

      {post.imageUrl && (
        <Link href={`/community/post/${post.id}`} className="mt-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt=""
            className="max-h-80 w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
          />
        </Link>
      )}

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-cyan-300 dark:hover:bg-zinc-800"
        >
          🔗 {post.linkLabel ?? new URL(post.linkUrl).hostname}
        </a>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-800">
        <Link
          href={`/community/post/${post.id}`}
          className="font-medium hover:text-blue-600"
        >
          💬 {post.commentCount} {post.kind === "QUESTION" ? (post.commentCount === 1 ? "answer" : "answers") : (post.commentCount === 1 ? "comment" : "comments")}
        </Link>
        <Link
          href={`/community/post/${post.id}`}
          className="ml-auto text-xs font-medium text-blue-600 hover:underline"
        >
          Open →
        </Link>
      </div>
    </article>
  );
}
