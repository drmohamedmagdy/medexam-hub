"use client";

import { useActionState, useState } from "react";
import { createExamAction, type NewExamState } from "@/app/actions/exam";
import { SPECIALTIES } from "@/lib/specialties";
import { EXAM_TYPE_GROUPS, getAllExamTypeIds } from "@/lib/exam-types";
import { EXAM_LANGUAGES, DEFAULT_LANGUAGE, findLanguage } from "@/lib/languages";
import type { Translations } from "@/lib/i18n";
import type { Difficulty, ExamMode } from "@/generated/prisma/client";

type Labels = Translations["newExam"];
type GenerationMode = "specialty" | "exam";

const DIFFICULTY_KEYS = [
  "BEGINNER", "STUDENT", "INTERN", "RESIDENT", "SPECIALIST", "CONSULTANT", "BOARD",
] as const;

type Defaults = {
  generationMode: GenerationMode;
  specialty: string | null;
  topic: string | null;
  examType: string | null;
  difficulty: Difficulty | null;
  mode: ExamMode | null;
  language: string | null;
  numQuestions: number | null;
};

export default function NewExamForm({
  remaining,
  maxPerExam,
  defaultLanguage,
  labels,
  defaults,
}: {
  remaining: number;
  maxPerExam: number;
  defaultLanguage?: string;
  labels: Labels;
  defaults?: Defaults;
}) {
  const [state, action, pending] = useActionState<NewExamState, FormData>(createExamAction, null);
  const [mode, setMode] = useState<GenerationMode>(defaults?.generationMode ?? "specialty");
  const canGenerate = remaining >= 1;

  const langDefault = findLanguage(defaults?.language ?? defaultLanguage ?? DEFAULT_LANGUAGE)
    ? (defaults?.language ?? defaultLanguage ?? DEFAULT_LANGUAGE)
    : DEFAULT_LANGUAGE;

  const specialtyDefault =
    defaults?.specialty && SPECIALTIES.includes(defaults.specialty as (typeof SPECIALTIES)[number])
      ? defaults.specialty
      : "Diabetic Foot";

  const examTypeDefault =
    defaults?.examType && getAllExamTypeIds().includes(defaults.examType)
      ? defaults.examType
      : "USMLE Step 2 CK";

  const difficultyDefault = defaults?.difficulty ?? "RESIDENT";
  const modeDefault = defaults?.mode ?? "PRACTICE";

  const numQDefault = (() => {
    const wanted = defaults?.numQuestions ?? 5;
    return Math.min(Math.max(1, wanted), maxPerExam);
  })();

  return (
    <form action={action} className="mt-8 space-y-5">
      {defaults && (defaults.specialty || defaults.examType) && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Pre-filled from your last exam. Adjust anything you want before generating.
        </p>
      )}

      <div className="rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <div className="grid grid-cols-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("specialty")}
            className={`rounded-md py-2 font-medium transition ${
              mode === "specialty" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {labels.bySpecialty}
          </button>
          <button
            type="button"
            onClick={() => setMode("exam")}
            className={`rounded-md py-2 font-medium transition ${
              mode === "exam" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {labels.byExam}
          </button>
        </div>
      </div>

      {mode === "specialty" ? (
        <>
          <Field label={labels.specialty}>
            <select
              name="specialty"
              required
              defaultValue={specialtyDefault}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label={labels.topic}>
            <input
              name="topic"
              required
              minLength={2}
              maxLength={120}
              defaultValue={defaults?.topic ?? ""}
              placeholder={labels.topicPlaceholder}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <input type="hidden" name="examType" value="" />
        </>
      ) : (
        <>
          <Field label={labels.exam}>
            <select
              name="examType"
              required
              defaultValue={examTypeDefault}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {EXAM_TYPE_GROUPS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={labels.specialtyOptional}>
              <select
                name="specialty"
                defaultValue={defaults?.specialty ?? ""}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">{labels.any}</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label={labels.topicOptional}>
              <input
                name="topic"
                maxLength={120}
                defaultValue={defaults?.topic ?? ""}
                placeholder={labels.topicOptionalPlaceholder}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label={labels.difficulty}>
          <select
            name="difficulty"
            required
            defaultValue={difficultyDefault}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {DIFFICULTY_KEYS.map((k) => (
              <option key={k} value={k}>{labels.difficulties[k]}</option>
            ))}
          </select>
        </Field>
        <Field label={labels.mode}>
          <select
            name="mode"
            required
            defaultValue={modeDefault}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="PRACTICE">{labels.modePractice}</option>
            <option value="EXAM">{labels.modeExam}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={labels.questionsMax.replace("{n}", String(maxPerExam))}>
          <input
            name="numQuestions"
            type="number"
            required
            min={1}
            max={maxPerExam}
            defaultValue={numQDefault}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label={labels.timeLimit}>
          <input
            name="timeLimitMin"
            type="number"
            min={0}
            max={240}
            placeholder={labels.timeLimitPlaceholder}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <Field label={labels.questionLanguage}>
        <select
          name="language"
          required
          defaultValue={langDefault}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {EXAM_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">{labels.languageHint}</p>
      </Field>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canGenerate}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? labels.generateLoading : labels.generate}
      </button>
      <p className="text-xs text-zinc-500">{labels.disclaimer}</p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
