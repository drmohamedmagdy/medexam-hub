import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodaysQuestion, todayKey } from "@/lib/daily-question";
import { answerQotdAction } from "./actions";

export const metadata = {
  title: "Question of the Day — MedExam Hub",
  description:
    "Free daily medical MCQ for students, residents and doctors. One question, every day, across all specialties.",
};

// Public page — visible without login (great for SEO and first-touch
// discovery), but answering requires an account. We auto-revalidate
// every hour so the page picks up the cron-generated row promptly.
export const revalidate = 3600;

type Option = { id: string; text: string };

export default async function QotdPage() {
  const [user, qotd] = await Promise.all([getCurrentUser(), getTodaysQuestion()]);

  // Cron hasn't run yet (or failed) — show a polite placeholder rather
  // than a 404. The cron will populate this within hours.
  if (!qotd) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Question of the day
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Today&apos;s question is on its way
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Our daily question is freshly generated each morning (UTC). Check back
          in a bit — or sign up and get the link by email each day.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign up free
          </Link>
          <Link
            href="/exam/new"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Generate a full exam
          </Link>
        </div>
      </div>
    );
  }

  const options = JSON.parse(qotd.optionsJson) as Option[];

  // Has the signed-in user already answered today?
  const attempt = user
    ? await prisma.dailyQuestionAttempt.findUnique({
        where: {
          userId_dailyQuestionId: {
            userId: user.id,
            dailyQuestionId: qotd.id,
          },
        },
      })
    : null;

  // Lightweight global stats for the result card. Cheap query — one row
  // per attempt, fast on the (userId, answeredAt) index.
  const attemptStats = attempt
    ? await prisma.dailyQuestionAttempt.aggregate({
        where: { dailyQuestionId: qotd.id },
        _count: { _all: true },
      })
    : null;
  const correctStats = attempt
    ? await prisma.dailyQuestionAttempt.count({
        where: { dailyQuestionId: qotd.id, isCorrect: true },
      })
    : null;
  const totalAttempts = attemptStats?._count._all ?? 0;
  const correctPct =
    totalAttempts > 0 ? Math.round(((correctStats ?? 0) / totalAttempts) * 100) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Question of the day — {todayKey()}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Test yourself in 60 seconds
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {qotd.specialty}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {qotd.difficulty}
          </span>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <p className="text-base leading-relaxed">{qotd.prompt}</p>

        {!user ? (
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              Sign in to answer and see the explanation
            </p>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
              Free account. We&apos;ll save your answer so you can build a
              streak. No card needed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/signup?next=${encodeURIComponent("/qotd")}`}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent("/qotd")}`}
                className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : attempt ? (
          // Answered — reveal correct answer, explanation, and stats.
          <div className="mt-6">
            <ul className="space-y-2">
              {options.map((opt) => {
                const isCorrectAnswer = opt.id === qotd.correctId;
                const wasSelected = opt.id === attempt.selectedId;
                return (
                  <li
                    key={opt.id}
                    className={`rounded-md border p-3 text-sm ${
                      isCorrectAnswer
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : wasSelected
                          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                          : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="font-mono text-xs text-zinc-500">{opt.id}.</span>{" "}
                    {opt.text}
                    {isCorrectAnswer && (
                      <span className="ms-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        ✓ Correct
                      </span>
                    )}
                    {wasSelected && !isCorrectAnswer && (
                      <span className="ms-2 text-xs font-semibold text-red-700 dark:text-red-400">
                        Your answer
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 rounded-md bg-zinc-50 p-4 text-sm dark:bg-zinc-800/40">
              <p className="font-semibold">Explanation</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{qotd.explanation}</p>
              {qotd.learningPoint && (
                <>
                  <p className="mt-3 font-semibold">Learning point</p>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {qotd.learningPoint}
                  </p>
                </>
              )}
              {correctPct !== null && (
                <p className="mt-3 text-xs text-zinc-500">
                  {totalAttempts.toLocaleString()} answer{totalAttempts === 1 ? "" : "s"} so far — {correctPct}% correct.
                </p>
              )}
            </div>
            <p className="mt-4 text-center text-sm">
              {attempt.isCorrect
                ? "🎉 Nice — come back tomorrow for a new one."
                : "💡 Better luck tomorrow — bookmark this page or sign up for the daily email."}
            </p>
          </div>
        ) : (
          // Not yet answered — show the answer form.
          <form action={answerQotdAction} className="mt-6 space-y-2">
            <input type="hidden" name="dailyQuestionId" value={qotd.id} />
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 text-sm hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:hover:border-blue-600 dark:has-[:checked]:bg-blue-950/30"
              >
                <input
                  type="radio"
                  name="selectedId"
                  value={opt.id}
                  required
                  className="mt-0.5"
                />
                <span>
                  <span className="font-mono text-xs text-zinc-500">{opt.id}.</span>{" "}
                  {opt.text}
                </span>
              </label>
            ))}
            <button
              type="submit"
              className="mt-4 w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Submit answer
            </button>
          </form>
        )}
      </section>

      <div className="mt-8 text-center text-xs text-zinc-500">
        Want unlimited practice?{" "}
        <Link href="/plans" className="text-blue-600 hover:underline">
          See plans
        </Link>{" "}
        — 299 EGP/mo unlocks 400 questions across every specialty.
      </div>
    </div>
  );
}
