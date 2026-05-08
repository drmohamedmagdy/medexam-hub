import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startSharedExamAction } from "@/app/actions/exam-share";

export const metadata = { title: "Shared exam — MedExam Hub" };

export default async function SharedExamLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const exam = await prisma.exam.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      specialty: true,
      examType: true,
      difficulty: true,
      questionFormat: true,
      numQuestions: true,
      timeLimitSec: true,
      userId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      _count: { select: { sharedAttempts: true } },
    },
  });
  if (!exam) notFound();

  const me = await getCurrentUser();

  // Creator clicked their own link — bounce them to the leaderboard.
  if (me && me.id === exam.userId) {
    redirect(`/exam/${exam.id}/leaderboard`);
  }

  // Already-taken-by-this-user — show their own results.
  if (me) {
    const existing = await prisma.exam.findFirst({
      where: { userId: me.id, sharedFromId: exam.id },
      select: { id: true, status: true },
    });
    if (existing && existing.status === "COMPLETED") {
      redirect(`/exam/${existing.id}/results`);
    }
    if (existing) {
      redirect(`/exam/${existing.id}`);
    }
  }

  const creatorName =
    exam.user.name?.trim() || exam.user.email.split("@")[0];
  const formatLabel =
    exam.questionFormat === "TRUE_FALSE"
      ? "True / False"
      : exam.questionFormat === "SHORT_NOTES"
        ? "Short notes"
        : "MCQ";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
          🎯 Shared exam from {creatorName}
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          {exam.title}
        </h1>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Questions" value={String(exam.numQuestions)} />
          <Stat label="Format" value={formatLabel} />
          <Stat label="Difficulty" value={exam.difficulty.toLowerCase()} />
          <Stat
            label="Time limit"
            value={
              exam.timeLimitSec
                ? `${Math.round(exam.timeLimitSec / 60)} min`
                : "Untimed"
            }
          />
        </dl>

        {(exam.specialty || exam.examType) && (
          <p className="mt-4 text-xs text-zinc-500">
            {[exam.examType, exam.specialty].filter(Boolean).join(" · ")}
          </p>
        )}

        <p className="mt-6 text-sm text-zinc-700 dark:text-slate-300">
          Take the exact same {exam.numQuestions} question
          {exam.numQuestions === 1 ? "" : "s"} {creatorName} just answered.
          Your score will appear on their leaderboard alongside the other
          attempts.
        </p>

        {exam._count.sharedAttempts > 0 && (
          <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            🏁 {exam._count.sharedAttempts} other{" "}
            {exam._count.sharedAttempts === 1 ? "attempt" : "attempts"} so far —
            think you can top them?
          </p>
        )}

        <div className="mt-7 border-t border-zinc-200 pt-5 dark:border-slate-800">
          {me ? (
            <form action={startSharedExamAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Start the exam →
              </button>
              <p className="mt-2 text-center text-xs text-zinc-500">
                One attempt per user — your score is final.
              </p>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Sign up free to take this exam.
              </p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-slate-400">
                <li>✓ 2 free exams included with your account</li>
                <li>✓ No credit card required</li>
                <li>✓ Score appears on the creator&apos;s leaderboard</li>
              </ul>
              <Link
                href={`/signup?next=${encodeURIComponent(`/e/${token}`)}`}
                className="block w-full rounded-md bg-blue-600 px-5 py-3 text-center text-base font-semibold text-white hover:bg-blue-700"
              >
                Sign up to take the exam →
              </Link>
              <p className="text-center text-xs text-zinc-500">
                Already have an account?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(`/e/${token}`)}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
