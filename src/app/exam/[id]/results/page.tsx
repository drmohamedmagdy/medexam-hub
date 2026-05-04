import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canExportPdf } from "@/lib/plans";
import PrintPdfButton from "./PrintPdfButton";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!exam || exam.userId !== user.id) redirect("/dashboard");
  if (exam.status !== "COMPLETED") redirect(`/exam/${id}`);

  const correct = exam.questions.filter((q) => q.isCorrect).length;
  const total = exam.questions.length;
  const canPdf = canExportPdf(user.plan);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-full print:px-0 print:py-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{exam.title}</h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {[exam.examType, exam.specialty, exam.difficulty].filter(Boolean).join(" · ")} · submitted{" "}
            {exam.submittedAt?.toLocaleString()}
          </p>
        </div>
        <div className="flex items-baseline gap-2 sm:block sm:text-right">
          <div className="text-3xl font-semibold">{Math.round(exam.scorePct ?? 0)}%</div>
          <div className="text-sm text-zinc-500">{correct} of {total} correct</div>
        </div>
      </div>

      {canPdf && (
        <div className="mt-4 print:hidden">
          <PrintPdfButton />
        </div>
      )}

      <ol className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
        {exam.questions.map((q, i) => {
          const opts = JSON.parse(q.optionsJson) as { id: string; text: string }[];
          return (
            <li
              key={q.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">
                  <span className="text-zinc-500">Q{i + 1}.</span> {q.prompt}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    q.isCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : q.selectedId === null
                        ? "bg-zinc-100 text-zinc-700"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {q.isCorrect ? "Correct" : q.selectedId === null ? "Skipped" : "Wrong"}
                </span>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                {opts.map((o) => {
                  const isCorrect = o.id === q.correctId;
                  const isPicked = o.id === q.selectedId;
                  return (
                    <li
                      key={o.id}
                      className={`rounded-md border px-3 py-2 ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                          : isPicked
                            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                            : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <span className="font-mono font-semibold">{o.id}.</span> {o.text}
                      {isCorrect && <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">correct answer</span>}
                      {isPicked && !isCorrect && <span className="ml-2 text-xs font-medium text-red-700 dark:text-red-400">your answer</span>}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 rounded-md bg-zinc-50 p-4 text-sm dark:bg-zinc-800/40">
                <p className="font-medium">Explanation</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{q.explanation}</p>
                {q.learningPoint && (
                  <p className="mt-2 text-xs text-zinc-500">
                    <span className="font-medium">Learning point:</span> {q.learningPoint}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:justify-between print:hidden">
        <Link href="/dashboard" className="rounded-md border border-zinc-300 px-4 py-2.5 text-center text-sm dark:border-zinc-700">
          Back to dashboard
        </Link>
        <Link href="/exam/new" className="rounded-md bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700">
          Generate another exam
        </Link>
      </div>
    </div>
  );
}
