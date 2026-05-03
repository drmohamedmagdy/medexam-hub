"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { submitExamAction } from "@/app/actions/exam";

type Question = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
};

export default function TakeExam({
  examId,
  title,
  mode,
  timeLimitSec,
  questions,
}: {
  examId: string;
  title: string;
  mode: "PRACTICE" | "EXAM";
  timeLimitSec: number | null;
  questions: Question[];
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(timeLimitSec);
  const formRef = useRef<HTMLFormElement>(null);

  const q = questions[idx];
  const total = questions.length;
  const allAnswered = useMemo(() => questions.every((qq) => answers[qq.id]), [questions, answers]);

  useEffect(() => {
    if (mode !== "EXAM" || timeLimitSec === null) return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, (timeLimitSec ?? 0) - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        formRef.current?.requestSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, timeLimitSec]);

  function pick(optionId: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            Q {idx + 1} / {total} · {mode === "EXAM" ? "Exam" : "Practice"} · {answeredCount}/{total} answered
          </p>
        </div>
        {secondsLeft !== null && (
          <div className="shrink-0 rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono text-sm tabular-nums dark:bg-zinc-800">
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:mt-8 sm:p-6">
        <p className="text-base leading-relaxed">{q.prompt}</p>
        <div className="mt-5 space-y-2 sm:mt-6">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition ${
                  selected
                    ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono font-semibold ${
                  selected ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}>
                  {o.id}
                </span>
                <span className="flex-1 leading-relaxed">{o.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky nav on mobile, inline on sm+ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:relative sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            ← Prev
          </button>
          <span className="hidden text-xs text-zinc-500 sm:block">
            {answeredCount} / {total}
          </span>
          {idx < total - 1 ? (
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Next →
            </button>
          ) : (
            <form ref={formRef} action={submitExamAction}>
              <input type="hidden" name="examId" value={examId} />
              <input type="hidden" name="answersJson" value={JSON.stringify(answers)} />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Submit
              </button>
            </form>
          )}
        </div>
      </div>
      {!allAnswered && idx === total - 1 && (
        <p className="mt-3 text-center text-xs text-zinc-500 sm:text-start">
          {answeredCount} of {total} answered. Unanswered questions count as incorrect.
        </p>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
