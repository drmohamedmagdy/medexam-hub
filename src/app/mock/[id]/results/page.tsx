import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTemplate } from "@/lib/mock-exam-templates";

export const metadata = { title: "Mock results — MedExam Hub" };

export default async function MockResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ abandoned?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: {
      exams: {
        orderBy: { blockIndex: "asc" },
        include: {
          questions: {
            select: {
              id: true,
              isCorrect: true,
              format: true,
              exam: { select: { specialty: true } },
            },
          },
        },
      },
    },
  });
  if (!mock || mock.userId !== user.id) notFound();

  const template = findTemplate(mock.templateId);

  const completedBlocks = mock.exams.filter((e) => e.status === "COMPLETED");
  const blockScores = completedBlocks.map((e) => ({
    id: e.id,
    blockIndex: e.blockIndex ?? 0,
    score: e.scorePct ?? 0,
    questions: e.numQuestions,
  }));

  const allQuestions = completedBlocks.flatMap((e) => e.questions);
  const gradableQuestions = allQuestions.filter(
    (q) => q.format !== "SHORT_NOTES" && q.isCorrect !== null
  );
  const correct = gradableQuestions.filter((q) => q.isCorrect === true).length;
  const overallPct =
    gradableQuestions.length === 0
      ? null
      : Math.round((correct / gradableQuestions.length) * 100);

  // Specialty breakdown across all blocks for the mock — gives the
  // user a focused "where I bled" view inside this single mock.
  const bySpec = new Map<string, { total: number; correct: number }>();
  for (const e of completedBlocks) {
    for (const q of e.questions) {
      if (q.format === "SHORT_NOTES" || q.isCorrect === null) continue;
      const key = q.exam?.specialty?.trim() || "Mixed";
      const cur = bySpec.get(key) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (q.isCorrect === true) cur.correct += 1;
      bySpec.set(key, cur);
    }
  }
  const specRows = [...bySpec.entries()]
    .map(([k, v]) => ({
      key: k,
      total: v.total,
      correct: v.correct,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/mock" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; All mocks
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        {mock.templateLabel}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {mock.completedAt
          ? `Completed ${mock.completedAt.toLocaleString()}`
          : mock.status === "abandoned"
            ? "Abandoned"
            : `Started ${mock.startedAt?.toLocaleString() ?? mock.createdAt.toLocaleString()}`}
      </p>

      {sp.abandoned === "quota" && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          You hit your monthly question quota partway through this mock — the
          remaining blocks weren&apos;t generated. Upgrade your plan to take a
          fresh mock end-to-end.
        </div>
      )}

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Overall score"
          value={overallPct === null ? "—" : `${overallPct}%`}
          hint={`${correct} / ${gradableQuestions.length} correct`}
        />
        <Stat
          label="Blocks completed"
          value={`${completedBlocks.length}${template ? ` / ${template.blocks.length}` : ""}`}
        />
        <Stat
          label="Questions answered"
          value={String(allQuestions.length)}
        />
      </section>

      {blockScores.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Per-block scores
          </h2>
          <ul className="mt-3 space-y-2">
            {blockScores.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="font-semibold">Block {b.blockIndex + 1}</div>
                  <div className="text-xs text-zinc-500">
                    {b.questions} questions
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{Math.round(b.score)}%</div>
                  <Link
                    href={`/exam/${b.id}/results`}
                    className="text-xs text-blue-600 hover:underline dark:text-cyan-400"
                  >
                    Review →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {specRows.length > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Specialty breakdown
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {specRows.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {s.key}
                </span>
                <span className="text-xs text-zinc-500">
                  {s.correct} / {s.total}
                </span>
                <span
                  className={`w-12 text-end font-mono text-xs ${
                    s.pct >= 75
                      ? "text-emerald-700 dark:text-emerald-400"
                      : s.pct >= 50
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {s.pct}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/mock"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          🎯 Take another mock
        </Link>
        <Link
          href="/review"
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          📚 Drill my mistakes →
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
