import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  MOCK_TEMPLATES,
  totalMinutes,
  totalQuestions,
} from "@/lib/mock-exam-templates";
import { startMockExamAction } from "@/app/actions/mock-exam";

export const metadata = { title: "Mock exams — MedExam Hub" };

export default async function MockIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; max?: string; need?: string; remaining?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const recent = await prisma.mockExam.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      exams: {
        select: { id: true, status: true, scorePct: true, blockIndex: true },
        orderBy: { blockIndex: "asc" },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        🎯 Mock exams
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Timed multi-block simulations that mirror the real exam format —
        same pressure, same pacing. Each block is locked once you submit.
      </p>

      {sp.error === "quota" && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          You need {sp.need} questions to start this mock, but only{" "}
          {sp.remaining} remain on your plan this month. Upgrade or pick a
          smaller mock.
        </div>
      )}
      {sp.error === "plan" && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Your plan limits exams to {sp.max} questions each; this mock has a
          block of {sp.need}.{" "}
          <Link href="/plans" className="font-semibold underline">
            Upgrade
          </Link>{" "}
          to unlock.
        </div>
      )}
      {sp.error === "template" && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          That mock template doesn&apos;t exist.
        </div>
      )}

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        {MOCK_TEMPLATES.map((t) => (
          <form
            key={t.id}
            action={startMockExamAction}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
          >
            <input type="hidden" name="templateId" value={t.id} />
            <div>
              <div className="text-base font-semibold">{t.label}</div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.description}
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <li>📝 {totalQuestions(t)} questions total</li>
              <li>⏱ {totalMinutes(t)} min including breaks</li>
              <li>📑 {t.blocks.length} blocks</li>
            </ul>
            <div className="mt-auto pt-2">
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ▶ Start mock
              </button>
              <p className="mt-1 text-center text-[11px] text-zinc-500">
                Consumes {totalQuestions(t)} questions from your monthly quota.
              </p>
            </div>
          </form>
        ))}
      </section>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Your recent mocks
          </h2>
          <ul className="mt-3 space-y-2">
            {recent.map((m) => {
              const completed = m.exams.filter(
                (e) => e.status === "COMPLETED" && e.scorePct !== null
              );
              const avg =
                completed.length === 0
                  ? null
                  : Math.round(
                      completed.reduce((s, e) => s + (e.scorePct ?? 0), 0) /
                        completed.length
                    );
              return (
                <li key={m.id}>
                  <Link
                    href={
                      m.status === "in_progress"
                        ? `/mock/${m.id}/break`
                        : `/mock/${m.id}/results`
                    }
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{m.templateLabel}</div>
                      <div className="text-xs text-zinc-500">
                        {m.createdAt.toLocaleString()} ·{" "}
                        {m.exams.length} block{m.exams.length === 1 ? "" : "s"} ·{" "}
                        {m.status === "in_progress"
                          ? "In progress"
                          : m.status === "completed"
                            ? `Completed${avg !== null ? ` · ${avg}%` : ""}`
                            : "Abandoned"}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
