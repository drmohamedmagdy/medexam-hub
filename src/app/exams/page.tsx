import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";

export const metadata = { title: "Exam history — MedExam Hub" };

const PAGE_SIZE = 25;

export default async function ExamHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  type ExamWhere = NonNullable<Parameters<typeof prisma.exam.findMany>[0]>["where"];
  const where: ExamWhere = { userId: user.id };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { specialty: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
      { examType: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "COMPLETED" || status === "READY" || status === "IN_PROGRESS" || status === "FAILED") {
    where.status = status;
  }

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true, title: true, specialty: true, topic: true, examType: true,
        difficulty: true, mode: true, status: true,
        numQuestions: true, scorePct: true,
        createdAt: true, submittedAt: true,
      },
    }),
    prisma.exam.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; {t.account.backToDashboard}
      </Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.dashboard.recentExams}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} {total === 1 ? "exam" : "exams"} total
          </p>
        </div>
        <Link
          href="/exam/new"
          className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto sm:py-2"
        >
          {t.dashboard.generateNew}
        </Link>
      </div>

      <form className="mt-6 grid grid-cols-1 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, specialty, topic…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 sm:w-72"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="READY">Not started</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:flex-none"
          >
            Filter
          </button>
          <Link
            href="/exams"
            className="flex-1 rounded-md border border-zinc-300 px-4 py-2.5 text-center text-sm dark:border-zinc-700 sm:flex-none"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {exams.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            {q || status
              ? "No exams match these filters."
              : (
                <>
                  {t.dashboard.noExams}{" "}
                  <Link href="/exam/new" className="text-blue-600 hover:underline">
                    {t.dashboard.generateFirst}
                  </Link>
                </>
              )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {exams.map((e) => {
              const reviewable = e.status === "COMPLETED";
              const target = reviewable ? `/exam/${e.id}/results` : `/exam/${e.id}`;
              const statusMap: Record<string, string> = {
                GENERATING: t.dashboard.status.generating,
                READY: t.dashboard.status.ready,
                IN_PROGRESS: t.dashboard.status.inProgress,
                COMPLETED: t.dashboard.status.completed,
                FAILED: t.dashboard.status.failed,
              };
              return (
                <li key={e.id}>
                  <Link
                    href={target}
                    className="flex items-start justify-between gap-3 p-4 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-snug">{e.title}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {[e.examType, e.specialty, e.difficulty, `${e.numQuestions} Q`, e.mode === "EXAM" ? "Timed" : "Practice"]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-400">
                        {e.createdAt.toLocaleDateString(locale)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : e.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : e.status === "IN_PROGRESS"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {statusMap[e.status] ?? e.status.toLowerCase()}
                      </span>
                      {e.scorePct !== null && (
                        <span className="font-mono text-xs text-zinc-500">{Math.round(e.scorePct)}%</span>
                      )}
                      <span className="text-xs font-medium text-blue-600">
                        {reviewable ? "Review →" : "Open →"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/exams?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(page - 1) }).toString()}`}
                className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/exams?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(page + 1) }).toString()}`}
                className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
