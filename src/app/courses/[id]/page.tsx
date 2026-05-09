import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBytes, formatDuration } from "@/lib/courses";
import VideoPlayer from "./VideoPlayer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.course.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: c ? `${c.title} — MedExam Hub` : "Course — MedExam Hub" };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || !course.isPublished) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/courses"
        className="text-sm text-zinc-500 hover:text-blue-600 dark:hover:text-cyan-400"
      >
        ← Back to courses
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {course.title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-slate-400">
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {course.category}
        </span>
        {course.durationSec ? <span>· {formatDuration(course.durationSec)}</span> : null}
        <span>· {formatBytes(course.videoSizeBytes)}</span>
        <span>· {course.viewCount} views</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-slate-800">
        <VideoPlayer
          courseId={course.id}
          src={course.videoUrl}
          mimeType={course.videoMimeType}
          poster={course.thumbnailUrl ?? undefined}
        />
      </div>

      {course.description && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-base font-semibold">About this course</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-slate-300">
            {course.description}
          </p>
        </div>
      )}
    </div>
  );
}
