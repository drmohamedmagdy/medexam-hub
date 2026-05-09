import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import GalleryManager from "../edit/GalleryManager";

export const metadata = { title: "My content — MedExam Hub" };

export default async function ProfileContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (user.id !== id) redirect(`/u/${id}`);

  const [media, articles] = await Promise.all([
    prisma.profileMedia.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        kind: true,
        url: true,
        caption: true,
        mimeType: true,
        originalName: true,
      },
    }),
    prisma.post.findMany({
      where: { authorId: user.id, kind: "ARTICLE", groupId: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, body: true, createdAt: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/u/${user.id}`}
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Back to profile
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        My content
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Upload images, videos, and study files, and publish articles.
      </p>

      <GalleryManager media={media} />

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Articles
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Long-form posts you publish. Articles live in the Community
              feed too — pick &ldquo;Article&rdquo; in the composer.
            </p>
          </div>
          <Link
            href="/community"
            className="shrink-0 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
          >
            ✍️ Write article
          </Link>
        </div>

        {articles.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
            You haven&apos;t published any articles yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {articles.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <Link
                  href={`/community/post/${a.id}`}
                  className="block font-semibold hover:text-blue-600 dark:hover:text-cyan-400"
                >
                  📰 {a.title?.trim() || "Untitled article"}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                  {a.body.slice(0, 200)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {a.createdAt.toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
