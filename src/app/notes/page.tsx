import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Study notes — MedExam Hub" };

export default async function NotesIndexPage() {
  const user = await requireUser();
  const notes = await prisma.studyNote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      topic: true,
      specialty: true,
      examType: true,
      createdAt: true,
      content: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            📝 Study notes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Quick AI-generated revision summaries on any topic. Use them
            the night before an exam.
          </p>
        </div>
        <Link
          href="/notes/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          ✨ Generate a new note
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You haven&apos;t generated any notes yet.
          </p>
          <Link
            href="/notes/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Generate your first note →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold">{n.topic}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {[n.specialty, n.examType].filter(Boolean).join(" · ") ||
                        "General"}
                      {" · "}
                      {n.createdAt.toLocaleDateString()}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {n.content.slice(0, 200).replace(/[#*_]/g, "")}
                    </p>
                  </div>
                  <span className="text-zinc-300" aria-hidden>
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
