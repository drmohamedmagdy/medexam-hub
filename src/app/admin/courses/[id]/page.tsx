import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatBytes, formatDuration } from "@/lib/courses";
import { adminDeleteCourseAction } from "@/app/actions/courses";
import EditForm from "./EditForm";

export const metadata = { title: "Admin — Edit course" };

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.course.findUnique({ where: { id } });
  if (!c) notFound();

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to courses
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            🎬 {formatBytes(c.videoSizeBytes)} · {formatDuration(c.durationSec)} ·{" "}
            {c.viewCount} views · uploaded {c.createdAt.toLocaleDateString()}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{c.videoFilename}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${c.id}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            View
          </Link>
          <a
            href={c.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Download
          </a>
          <form action={adminDeleteCourseAction}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {c.thumbnailUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.thumbnailUrl}
            alt="Thumbnail"
            className="aspect-video w-full max-w-sm rounded-md border border-zinc-200 object-cover dark:border-zinc-800"
          />
        </div>
      )}

      <EditForm
        defaults={{
          id: c.id,
          title: c.title,
          description: c.description ?? "",
          category: c.category,
          isPublished: c.isPublished,
        }}
      />
    </div>
  );
}
