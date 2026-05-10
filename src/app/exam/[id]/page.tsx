import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TakeExam from "./TakeExam";
import ShareExamCard from "./results/ShareExamCard";

type QuestionForClient = {
  id: string;
  prompt: string;
  format: "MCQ" | "TRUE_FALSE" | "SHORT_NOTES";
  options: { id: string; text: string }[];
};

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!exam || exam.userId !== user.id) redirect("/dashboard");

  if (exam.status === "COMPLETED") redirect(`/exam/${id}/results`);
  if (exam.status === "FAILED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold">This exam failed to generate</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The AI service didn&apos;t return a valid exam. Try again from the dashboard.
        </p>
        <Link href="/exam/new" className="mt-6 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-white">
          New exam
        </Link>
      </div>
    );
  }

  const questions: QuestionForClient[] = exam.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    format: q.format,
    options: JSON.parse(q.optionsJson) as { id: string; text: string }[],
  }));

  // Share UI shows on the master exam only — not on forks taken by
  // other users (they can't re-share someone else's exam).
  const isOriginal = exam.sharedFromId === null;
  const attemptCount = isOriginal
    ? await prisma.exam.count({
        where: { sharedFromId: exam.id, status: "COMPLETED" },
      })
    : 0;
  const shareUrl = exam.shareToken
    ? `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://medexamhub.org"}/e/${exam.shareToken}`
    : null;

  // Lockdown mode kicks in for any exam taken under "test conditions":
  // either creator chose EXAM mode, or this is a forked attempt of someone
  // else's shared exam (where leaderboard fairness matters). Practice
  // attempts on the user's own exams stay relaxed.
  const lockdown = exam.mode === "EXAM" || exam.sharedFromId !== null;
  const watermark = user.email;

  return (
    <>
      {isOriginal && (
        <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
          <ShareExamCard
            examId={exam.id}
            initialToken={exam.shareToken}
            initialUrl={shareUrl}
            attemptCount={attemptCount}
            initialExpiresAt={exam.shareExpiresAt}
            initialMaxTakers={exam.shareMaxTakers}
            initialTimeLimitSec={exam.shareTimeLimitSec}
          />
        </div>
      )}
      <TakeExam
        examId={exam.id}
        title={exam.title}
        mode={exam.mode}
        timeLimitSec={exam.timeLimitSec}
        questionFormat={exam.questionFormat}
        questions={questions}
        lockdown={lockdown}
        watermark={watermark}
      />
    </>
  );
}
