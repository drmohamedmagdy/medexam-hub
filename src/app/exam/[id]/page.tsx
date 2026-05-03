import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TakeExam from "./TakeExam";

type QuestionForClient = {
  id: string;
  prompt: string;
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
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">This exam failed to generate</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The AI service didn&apos;t return a valid exam. Try again from the dashboard.
        </p>
        <Link href="/exam/new" className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white">
          New exam
        </Link>
      </div>
    );
  }

  const questions: QuestionForClient[] = exam.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: JSON.parse(q.optionsJson) as { id: string; text: string }[],
  }));

  return (
    <TakeExam
      examId={exam.id}
      title={exam.title}
      mode={exam.mode}
      timeLimitSec={exam.timeLimitSec}
      questions={questions}
    />
  );
}
