import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canExportPdf } from "@/lib/plans";
import PrintPdfButton from "./PrintPdfButton";
import ScoreCelebration from "./ScoreCelebration";
import ShareExamCard from "./ShareExamCard";
import Confetti from "@/components/Confetti";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!exam || exam.userId !== user.id) redirect("/dashboard");
  if (exam.status !== "COMPLETED") redirect(`/exam/${id}`);

  const isShortNotes = exam.questionFormat === "SHORT_NOTES";
  const correct = exam.questions.filter((q) => q.isCorrect).length;
  const total = exam.questions.length;
  const canPdf = canExportPdf(user.plan);
  const scoreInt = Math.round(exam.scorePct ?? 0);
  const showConfetti = !isShortNotes && scoreInt >= 95;
  // Share section is only useful for the original exam (not forks). Count
  // attempts so the card can link to the leaderboard when there are any.
  const isOriginal = exam.sharedFromId === null;
  const attemptCount = isOriginal
    ? await prisma.exam.count({
        where: { sharedFromId: exam.id, status: "COMPLETED" },
      })
    : 0;
  const shareUrl = exam.shareToken
    ? `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://medexamhub.org"}/e/${exam.shareToken}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-full print:px-0 print:py-0">
      <Confetti trigger={showConfetti} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{exam.title}</h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {[exam.examType, exam.specialty, exam.difficulty, formatLabel(exam.questionFormat)]
              .filter(Boolean)
              .join(" · ")}{" "}
            · submitted {exam.submittedAt?.toLocaleString()}
          </p>
        </div>
        {!isShortNotes ? (
          <div className="flex items-baseline gap-2 sm:block sm:text-right">
            <div className="text-3xl font-semibold">{scoreInt}%</div>
            <div className="text-sm text-zinc-500">{correct} of {total} correct</div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            {total} question{total === 1 ? "" : "s"} · self-assessed
          </div>
        )}
      </div>

      {!isShortNotes && (
        <ScoreCelebration score={scoreInt} correct={correct} total={total} />
      )}
      {isShortNotes && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 sm:p-5 print:hidden">
          <p className="font-semibold">Self-assessment time</p>
          <p className="mt-1">
            Compare your answer with the model answer below for each question. Did you cover the
            main points? Use this to gauge your own progress.
          </p>
        </div>
      )}

      {canPdf && (
        <div className="mt-4 print:hidden">
          <PrintPdfButton />
        </div>
      )}

      {isOriginal && (
        <ShareExamCard
          examId={exam.id}
          initialToken={exam.shareToken}
          initialUrl={shareUrl}
          attemptCount={attemptCount}
        />
      )}

      <ol className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
        {exam.questions.map((q, i) => {
          if (isShortNotes) {
            return (
              <li
                key={q.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
              >
                <p className="text-sm font-medium">
                  <span className="text-zinc-500">Q{i + 1}.</span> {q.prompt}
                </p>

                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Your answer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                    {q.selectedText && q.selectedText.trim().length > 0
                      ? q.selectedText
                      : "— No answer submitted —"}
                  </p>
                </div>

                {q.modelAnswer && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Model answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900 dark:text-emerald-100">
                      {q.modelAnswer}
                    </p>
                  </div>
                )}

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
          }

          // MCQ + TRUE_FALSE
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

function formatLabel(format: string): string {
  if (format === "TRUE_FALSE") return "True/False";
  if (format === "SHORT_NOTES") return "Short notes";
  return "MCQ";
}
