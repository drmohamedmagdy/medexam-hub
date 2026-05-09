import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReviewCardView from "./ReviewCardView";

export const metadata = { title: "Reviewing — MedExam Hub" };

type RawOption = { id: string; text: string };

function parseOptions(json: string): RawOption[] {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((o) => {
        if (
          o &&
          typeof o === "object" &&
          "id" in o &&
          "text" in o &&
          typeof (o as { id: unknown }).id === "string" &&
          typeof (o as { text: unknown }).text === "string"
        ) {
          return { id: (o as RawOption).id, text: (o as RawOption).text };
        }
        return null;
      })
      .filter((o): o is RawOption => o !== null);
  } catch {
    return [];
  }
}

export default async function ReviewSessionPage() {
  const user = await requireUser();
  const now = new Date();

  // Pull the next due card. Tie-break by oldest due so a queue clears in
  // FIFO order rather than the user seeing the same lapse repeatedly.
  const card = await prisma.reviewCard.findFirst({
    where: { userId: user.id, due: { lte: now } },
    orderBy: { due: "asc" },
    select: {
      id: true,
      state: true,
      intervalDays: true,
      ease: true,
      reps: true,
      lapses: true,
      question: {
        select: {
          id: true,
          prompt: true,
          format: true,
          optionsJson: true,
          correctId: true,
          explanation: true,
          learningPoint: true,
          modelAnswer: true,
        },
      },
    },
  });

  const remaining = await prisma.reviewCard.count({
    where: { userId: user.id, due: { lte: now } },
  });

  if (!card) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
            ✅ All caught up
          </h1>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
            No cards are due right now. Take another exam to add more, or come
            back later.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/review"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Back to review
            </Link>
            <Link
              href="/exam/new"
              className="rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-300 dark:text-emerald-200"
            >
              ✨ New exam
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const options = parseOptions(card.question.optionsJson);
  const correct = options.find((o) => o.id === card.question.correctId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/review"
          className="text-zinc-500 hover:text-blue-600"
        >
          &larr; End session
        </Link>
        <span className="text-xs text-zinc-500">
          {remaining} card{remaining === 1 ? "" : "s"} remaining
        </span>
      </div>

      <div className="mt-4">
        <ReviewCardView
          card={{
            id: card.id,
            state: card.state,
            intervalDays: card.intervalDays,
            ease: card.ease,
            reps: card.reps,
            lapses: card.lapses,
          }}
          question={{
            id: card.question.id,
            prompt: card.question.prompt,
            format: card.question.format as
              | "MCQ"
              | "TRUE_FALSE"
              | "SHORT_NOTES",
            options,
            correctId: card.question.correctId,
            correctText: correct?.text ?? null,
            explanation: card.question.explanation,
            learningPoint: card.question.learningPoint,
            modelAnswer: card.question.modelAnswer,
          }}
        />
      </div>
    </div>
  );
}
