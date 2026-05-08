"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { submitExamAction } from "@/app/actions/exam";

type QuestionFormat = "MCQ" | "TRUE_FALSE" | "SHORT_NOTES";

type Question = {
  id: string;
  prompt: string;
  format: QuestionFormat;
  options: { id: string; text: string }[];
};

export default function TakeExam({
  examId,
  title,
  mode,
  timeLimitSec,
  questionFormat,
  questions,
}: {
  examId: string;
  title: string;
  mode: "PRACTICE" | "EXAM";
  timeLimitSec: number | null;
  /** Exam-level "primary" format, used for the header pill on single-format
   * exams. Mixed-format exams fall back to "MIXED" labelling and each
   * Question renders its own input. */
  questionFormat: QuestionFormat;
  questions: Question[];
}) {
  const [idx, setIdx] = useState(0);
  // For MCQ/TF the value is the chosen option id; for SHORT_NOTES it's the
  // user's free-text answer. The shape is the same on the wire, the server
  // distinguishes by exam.questionFormat.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(timeLimitSec);
  const formRef = useRef<HTMLFormElement>(null);

  const q = questions[idx];
  const total = questions.length;
  const allAnswered = useMemo(
    () => questions.every((qq) => (answers[qq.id] ?? "").trim().length > 0),
    [questions, answers]
  );

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

  function pick(value: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  const answeredCount = Object.values(answers).filter((v) => (v ?? "").trim().length > 0).length;
  const isMixed =
    questions.length > 1 &&
    new Set(questions.map((qq) => qq.format)).size > 1;
  const headerFormat: QuestionFormat | "MIXED" = isMixed ? "MIXED" : questionFormat;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            Q {idx + 1} / {total} · {mode === "EXAM" ? "Exam" : "Practice"} ·{" "}
            <FormatPill format={headerFormat} />
            {isMixed && (
              <span className="ml-1.5 text-zinc-400">
                (this Q: <FormatPill format={q.format} />)
              </span>
            )}{" "}
            · {answeredCount}/{total} answered
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

        {q.format === "TRUE_FALSE" ? (
          <TrueFalseInput
            value={answers[q.id]}
            options={q.options}
            onPick={pick}
          />
        ) : q.format === "SHORT_NOTES" ? (
          <ShortNotesInput
            value={answers[q.id] ?? ""}
            onChange={pick}
          />
        ) : (
          <McqInput options={q.options} selectedId={answers[q.id]} onPick={pick} />
        )}
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
          {answeredCount} of {total} answered.
          {questionFormat === "SHORT_NOTES"
            ? " Unanswered questions stay blank — you can still submit and review the model answers."
            : " Unanswered questions count as incorrect."}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-format input renderers
// ─────────────────────────────────────────────────────────────────────────────

function McqInput({
  options,
  selectedId,
  onPick,
}: {
  options: { id: string; text: string }[];
  selectedId: string | undefined;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mt-5 space-y-2 sm:mt-6">
      {options.map((o) => {
        const selected = selectedId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition ${
              selected
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono font-semibold ${
                selected
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {o.id}
            </span>
            <span className="flex-1 leading-relaxed">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseInput({
  options,
  value,
  onPick,
}: {
  options: { id: string; text: string }[];
  value: string | undefined;
  onPick: (id: string) => void;
}) {
  // Use the AI-provided options when they look like True/False; otherwise
  // fall back to a fixed pair so the UI is always sensible.
  const tfOptions =
    options.length === 2 &&
    options.some((o) => /true/i.test(o.id) || /true/i.test(o.text)) &&
    options.some((o) => /false/i.test(o.id) || /false/i.test(o.text))
      ? options
      : [
          { id: "True", text: "True" },
          { id: "False", text: "False" },
        ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
      {tfOptions.map((o) => {
        const selected = value === o.id;
        const isTrue = /true/i.test(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-6 text-base font-semibold transition ${
              selected
                ? isTrue
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-red-500 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-200"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              {isTrue ? "✓" : "✕"}
            </span>
            <span className="mt-1.5">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShortNotesInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const charCount = value.length;
  return (
    <div className="mt-5 sm:mt-6">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        maxLength={3000}
        placeholder="Write your answer here. 2–4 sentences is usually right."
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800/50"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>You'll see the model answer after submitting — self-assess against it.</span>
        <span className="font-mono tabular-nums">{charCount} / 3000</span>
      </div>
    </div>
  );
}

function FormatPill({ format }: { format: QuestionFormat | "MIXED" }) {
  const label =
    format === "MIXED"
      ? "Mixed"
      : format === "TRUE_FALSE"
        ? "True/False"
        : format === "SHORT_NOTES"
          ? "Short notes"
          : "MCQ";
  return <span>{label}</span>;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
