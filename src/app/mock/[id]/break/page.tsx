import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTemplate } from "@/lib/mock-exam-templates";
import { advanceMockExamAction } from "@/app/actions/mock-exam";

export const metadata = { title: "Mock break — MedExam Hub" };

export default async function MockBreakPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string }>;
}) {
  const { id } = await params;
  const _sp = await searchParams;
  void _sp;
  const user = await requireUser();

  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: {
      exams: {
        orderBy: { blockIndex: "asc" },
        select: {
          id: true,
          blockIndex: true,
          status: true,
          scorePct: true,
          numQuestions: true,
        },
      },
    },
  });
  if (!mock || mock.userId !== user.id) notFound();

  const template = findTemplate(mock.templateId);
  if (!template) notFound();

  const blocksTaken = mock.exams.filter((e) => e.status === "COMPLETED").length;
  const totalBlocks = template.blocks.length;
  const lastExam = mock.exams[mock.exams.length - 1];
  const allDone = blocksTaken >= totalBlocks;

  // Average across completed blocks for an in-flight progress hint.
  const completed = mock.exams.filter(
    (e) => e.status === "COMPLETED" && e.scorePct !== null
  );
  const avg =
    completed.length === 0
      ? null
      : Math.round(
          completed.reduce((s, e) => s + (e.scorePct ?? 0), 0) /
            completed.length
        );

  if (allDone) {
    // Auto-redirect to results when there's nothing left to take.
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Mock complete</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;ve finished every block. Pull up your full results below.
        </p>
        <Link
          href={`/mock/${mock.id}/results`}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          See full results →
        </Link>
      </div>
    );
  }

  const nextBlockIndex = blocksTaken;
  const nextBlock = template.blocks[nextBlockIndex];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-cyan-400">
        {template.label}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Block {nextBlockIndex} of {totalBlocks} done
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Take a {template.breakBetweenBlocksMin}-minute break, then start the
        next block when you&apos;re ready. The next block is generated when you
        click below.
      </p>

      {lastExam && lastExam.status === "COMPLETED" && lastExam.scorePct !== null && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Block {lastExam.blockIndex !== null ? lastExam.blockIndex + 1 : "?"} score
          </div>
          <div className="mt-1 text-3xl font-bold tracking-tight">
            {Math.round(lastExam.scorePct)}%
          </div>
          {avg !== null && completed.length > 1 && (
            <p className="mt-1 text-xs text-zinc-500">
              Running average across {completed.length} blocks: {avg}%
            </p>
          )}
          <Link
            href={`/exam/${lastExam.id}/results`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-cyan-400"
          >
            Review block answers →
          </Link>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-cyan-800/60 dark:bg-cyan-950/30">
        <h2 className="text-sm font-semibold text-blue-900 dark:text-cyan-200">
          Up next: Block {nextBlockIndex + 1}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-800 dark:text-cyan-300">
          <li>📝 {nextBlock.questions} questions</li>
          <li>⏱ {nextBlock.timeLimitMin} minutes</li>
        </ul>
        <form action={advanceMockExamAction} className="mt-4">
          <input type="hidden" name="mockExamId" value={mock.id} />
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700"
          >
            Start Block {nextBlockIndex + 1} →
          </button>
          <p className="mt-2 text-center text-xs text-blue-800 dark:text-cyan-300">
            Questions generate in ~10–20 seconds. The timer starts when the
            page loads.
          </p>
        </form>
      </section>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Need to pause for longer?{" "}
        <Link href="/mock" className="font-medium text-blue-600 hover:underline">
          Come back later
        </Link>{" "}
        — your mock is saved.
      </p>
    </div>
  );
}
