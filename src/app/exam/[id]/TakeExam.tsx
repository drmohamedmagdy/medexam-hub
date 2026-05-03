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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Question {idx + 1} of {total} · {mode === "EXAM" ? "Exam mode" : "Practice mode"}
          </p>
        </div>
        {secondsLeft !== null && (
          <div className="rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-sm dark:bg-zinc-800">
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-base">{q.prompt}</p>
        <div className="mt-6 space-y-2">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition ${
                  selected
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="font-mono font-semibold">{o.id}.</span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          Previous
        </button>
        {idx < total - 1 ? (
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Next
          </button>
        ) : (
          <form ref={formRef} action={submitExamAction}>
            <input type="hidden" name="examId" value={examId} />
            <input type="hidden" name="answersJson" value={JSON.stringify(answers)} />
            <button
              type="submit"
              disabled={!allAnswered}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              title={!allAnswered ? "Answer all questions to submit" : undefined}
            >
              Submit exam
            </button>
          </form>
        )}
      </div>
      {!allAnswered && (
        <p className="mt-3 text-xs text-zinc-500">
          {Object.keys(answers).length} of {total} answered.
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
