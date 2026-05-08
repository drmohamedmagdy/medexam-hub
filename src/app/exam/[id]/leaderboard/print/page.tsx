import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LeaderboardPrintClient from "./LeaderboardPrintClient";

export const metadata = { title: "Leaderboard — print" };

export default async function LeaderboardPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireUser();

  const master = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!master || master.userId !== me.id) redirect("/dashboard");

  const attempts = await prisma.exam.findMany({
    where: { sharedFromId: master.id, status: "COMPLETED" },
    select: {
      id: true,
      scorePct: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ scorePct: "desc" }, { submittedAt: "asc" }],
  });

  const isShortNotes = master.questionFormat === "SHORT_NOTES";
  const avg =
    attempts.length === 0
      ? 0
      : attempts.reduce((s, a) => s + (a.scorePct ?? 0), 0) / attempts.length;

  return (
    <LeaderboardPrintClient>
      <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-full print:px-0 print:py-0">
        <div className="mb-6 print:hidden">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Press <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs">Ctrl+P</kbd>{" "}
            (or <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs">⌘P</kbd>),
            choose <strong>Save as PDF</strong>, then save. The print dialog
            should already be open.
          </p>
        </div>

        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            Shared exam — Leaderboard &amp; model answers
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{master.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {[master.examType, master.specialty, master.difficulty]
              .filter(Boolean)
              .join(" · ")}{" "}
            · {master.numQuestions} question{master.numQuestions === 1 ? "" : "s"}
            · created {master.createdAt.toLocaleDateString()}
          </p>
        </header>

        <section className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-semibold">
            Attempts ({attempts.length})
            {attempts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-600">
                · average {avg.toFixed(0)}%
              </span>
            )}
          </h2>
          {attempts.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No attempts yet.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-300 text-xs uppercase tracking-wide text-zinc-600">
                  <th className="py-2 text-start">#</th>
                  <th className="py-2 text-start">User</th>
                  <th className="py-2 text-start">Submitted</th>
                  <th className="py-2 text-end">Score</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const name = a.user.name?.trim() || a.user.email.split("@")[0];
                  return (
                    <tr key={a.id} className="border-b border-zinc-200">
                      <td className="py-2 font-mono text-zinc-500">{i + 1}</td>
                      <td className="py-2 font-medium">{name}</td>
                      <td className="py-2 text-zinc-600">
                        {a.submittedAt?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-2 text-end font-mono font-semibold">
                        {Math.round(a.scorePct ?? 0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-10 break-before-page">
          <h2 className="text-lg font-semibold">Model answers</h2>
          <p className="mt-1 text-xs text-zinc-500">
            All correct answers and explanations for the {master.numQuestions}{" "}
            question{master.numQuestions === 1 ? "" : "s"} in this exam.
          </p>

          <ol className="mt-4 space-y-5">
            {master.questions.map((q, i) => {
              const opts = !isShortNotes
                ? (JSON.parse(q.optionsJson) as { id: string; text: string }[])
                : [];
              return (
                <li
                  key={q.id}
                  className="break-inside-avoid rounded-lg border border-zinc-200 p-4"
                >
                  <p className="text-sm font-medium">
                    <span className="text-zinc-500">Q{i + 1}.</span> {q.prompt}
                  </p>

                  {!isShortNotes && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {opts.map((o) => {
                        const isCorrect = o.id === q.correctId;
                        return (
                          <li
                            key={o.id}
                            className={`rounded border px-3 py-1.5 ${
                              isCorrect
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-zinc-200"
                            }`}
                          >
                            <span className="font-mono font-semibold">{o.id}.</span>{" "}
                            {o.text}
                            {isCorrect && (
                              <span className="ml-2 text-xs font-semibold text-emerald-700">
                                ✓ correct
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {isShortNotes && q.modelAnswer && (
                    <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Model answer
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-emerald-900">
                        {q.modelAnswer}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 rounded bg-zinc-50 p-3 text-sm">
                    <p className="font-medium">Explanation</p>
                    <p className="mt-1 text-zinc-700">{q.explanation}</p>
                    {q.learningPoint && (
                      <p className="mt-2 text-xs text-zinc-500">
                        <span className="font-medium">Learning point:</span>{" "}
                        {q.learningPoint}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          Generated by MedExam Hub · {new Date().toLocaleString()}
        </footer>
      </div>
    </LeaderboardPrintClient>
  );
}
