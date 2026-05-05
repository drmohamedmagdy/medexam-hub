"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mxh_new_exam_tour_seen";

type Step = {
  title: string;
  body: string;
  emoji: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Welcome to the exam generator",
    body:
      "Let's walk through how to build your first exam. Takes about 30 seconds — you can skip anytime.",
  },
  {
    emoji: "🗂️",
    title: "1. Pick a generation mode",
    body:
      "By specialty (free-form medical topic), by exam (USMLE/MRCS/Egyptian Fellowship style), from your uploaded file (Pro/Premium), or custom (paramedical & non-medical fields).",
  },
  {
    emoji: "🎯",
    title: "2. Set your difficulty",
    body:
      "Beginner / Student / Intern / Resident / Specialist / Consultant / Board. Match it to your level — you can always adjust later.",
  },
  {
    emoji: "⏱️",
    title: "3. Practice or Exam mode",
    body:
      "Practice mode: study without a timer. Exam mode: timed simulation closer to the real thing. Both build your stats.",
  },
  {
    emoji: "🚀",
    title: "Then click Generate",
    body:
      "AI writes your questions in 10–30 seconds. Each question has explanations and a learning point. You're set.",
  },
];

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so the page is rendered before the modal pops in
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      dismiss();
    } else {
      setStep(step + 1);
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md animate-[slideUp_300ms_ease-out] rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip tour"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-5xl" aria-hidden>{s.emoji}</div>
          <h2 id="tour-title" className="mt-3 text-lg font-semibold tracking-tight">
            {s.title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-slate-300">{s.body}</p>
        </div>

        {/* Step dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-blue-600 dark:bg-cyan-400"
                  : i < step
                    ? "w-1.5 bg-blue-300 dark:bg-cyan-700"
                    : "w-1.5 bg-zinc-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {isLast ? "Got it →" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
