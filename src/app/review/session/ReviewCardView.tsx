"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { gradeReviewCardAction } from "@/app/actions/review";
import { applyGrade, formatNextDue, type ReviewGrade } from "@/lib/spaced-repetition";

type Option = { id: string; text: string };

// Per-form button. useFormStatus only sees the form it's nested inside,
// so each grade form has its own pending indicator.
function GradeSubmitButton({
  className,
  label,
  nextLabel,
}: {
  className: string;
  label: string;
  nextLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex w-full flex-col items-center rounded-md px-3 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${className}`}
    >
      <span>{pending ? "…" : label}</span>
      <span className="text-[10px] font-normal text-white/80">{nextLabel}</span>
    </button>
  );
}

export default function ReviewCardView({
  card,
  question,
  specialty,
}: {
  card: {
    id: string;
    state: string;
    intervalDays: number;
    ease: number;
    reps: number;
    lapses: number;
  };
  question: {
    id: string;
    prompt: string;
    format: "MCQ" | "TRUE_FALSE" | "SHORT_NOTES";
    options: Option[];
    correctId: string;
    correctText: string | null;
    explanation: string;
    learningPoint: string | null;
    modelAnswer: string | null;
  };
  specialty?: string | null;
}) {
  const [revealed, setRevealed] = useState(false);

  // Preview what each grade would do, so the user can see the next interval
  // without committing first.
  const previewSnapshot = {
    state: card.state as "new" | "learning" | "review" | "relearning",
    intervalDays: card.intervalDays,
    ease: card.ease,
    reps: card.reps,
    lapses: card.lapses,
  };

  const grades: ReviewGrade[] = ["again", "hard", "good", "easy"];
  const gradeColors: Record<ReviewGrade, string> = {
    again: "bg-red-600 hover:bg-red-700",
    hard: "bg-amber-600 hover:bg-amber-700",
    good: "bg-emerald-600 hover:bg-emerald-700",
    easy: "bg-blue-600 hover:bg-blue-700",
  };
  const gradeLabels: Record<ReviewGrade, string> = {
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {question.format === "TRUE_FALSE"
          ? "True / false"
          : question.format === "SHORT_NOTES"
            ? "Short note"
            : "Multiple choice"}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">
        {question.prompt}
      </p>

      {question.options.length > 0 && (
        <ul className="mt-4 space-y-2">
          {question.options.map((opt) => {
            const isCorrect = opt.id === question.correctId;
            const showAsCorrect = revealed && isCorrect;
            return (
              <li
                key={opt.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  showAsCorrect
                    ? "border-emerald-400 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {opt.text}
                {showAsCorrect && (
                  <span className="ml-2 text-xs font-semibold uppercase">
                    ✓ correct
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
        >
          Show answer
        </button>
      ) : (
        <>
          <div className="mt-6 space-y-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            {question.format === "SHORT_NOTES" && question.modelAnswer && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Model answer
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {question.modelAnswer}
                </p>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Explanation
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                {question.explanation}
              </p>
            </div>
            {question.learningPoint && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Learning point
                </div>
                <p className="mt-1 leading-relaxed">{question.learningPoint}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            How well did you remember it?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {grades.map((g) => {
              const next = applyGrade(previewSnapshot, g);
              return (
                <form key={g} action={gradeReviewCardAction}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="grade" value={g} />
                  {specialty && (
                    <input type="hidden" name="specialty" value={specialty} />
                  )}
                  <GradeSubmitButton
                    className={gradeColors[g]}
                    label={gradeLabels[g]}
                    nextLabel={formatNextDue(next.intervalDays)}
                  />
                </form>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
