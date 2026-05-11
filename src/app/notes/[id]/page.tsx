import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteStudyNoteAction } from "@/app/actions/study-notes";
import { renderMarkdown } from "./render-markdown";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await prisma.studyNote.findUnique({
    where: { id },
    select: { topic: true },
  });
  return { title: `${note?.topic ?? "Note"} — MedExam Hub` };
}

export default async function StudyNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const note = await prisma.studyNote.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      topic: true,
      specialty: true,
      examType: true,
      language: true,
      content: true,
      createdAt: true,
    },
  });
  if (!note || note.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/notes" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; My notes
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {note.topic}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {[note.specialty, note.examType].filter(Boolean).join(" · ") ||
              "General"}
            {" · "}
            {note.createdAt.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/exam/new?topic=${encodeURIComponent(note.topic)}${
              note.specialty
                ? `&specialty=${encodeURIComponent(note.specialty)}`
                : ""
            }${
              note.examType ? `&examType=${encodeURIComponent(note.examType)}` : ""
            }`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            ✨ Test myself on this →
          </Link>
          <form action={deleteStudyNoteAction}>
            <input type="hidden" name="id" value={note.id} />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </form>
        </div>
      </header>

      <article className="prose prose-zinc mt-6 max-w-none dark:prose-invert">
        {renderMarkdown(note.content)}
      </article>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
        <Link
          href="/notes/new"
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          ✨ Generate another note
        </Link>
        <Link
          href="/exam/new"
          className="rounded-md border border-zinc-300 px-4 py-2 font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          + New exam
        </Link>
      </div>
    </div>
  );
}
