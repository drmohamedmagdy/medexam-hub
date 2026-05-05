"use client";

import { useActionState, useState } from "react";
import { createExamAction, type NewExamState } from "@/app/actions/exam";
import { uploadFileAction, type UploadState } from "@/app/actions/upload";
import { SPECIALTIES, SPECIALTY_GROUPS } from "@/lib/specialties";
import { EXAM_TYPE_GROUPS, getAllExamTypeIds } from "@/lib/exam-types";
import { EXAM_LANGUAGES, DEFAULT_LANGUAGE, findLanguage } from "@/lib/languages";
import type { Translations } from "@/lib/i18n";
import type { Difficulty, ExamMode } from "@/generated/prisma/client";

type Labels = Translations["newExam"];
type GenerationMode = "specialty" | "exam" | "file" | "custom";

const DIFFICULTY_KEYS = [
  "BEGINNER", "STUDENT", "INTERN", "RESIDENT", "SPECIALIST", "CONSULTANT", "BOARD",
] as const;

type Defaults = {
  generationMode: "specialty" | "exam" | "custom";
  specialty: string | null;
  topic: string | null;
  examType: string | null;
  difficulty: Difficulty | null;
  mode: ExamMode | null;
  language: string | null;
  numQuestions: number | null;
};

type RecentFile = {
  id: string;
  filename: string;
  charCount: number;
  createdAt: string;
};

type FileQuotaStatus = { used: number; limit: number; remaining: number } | null;

export default function NewExamForm({
  remaining,
  maxPerExam,
  defaultLanguage,
  labels,
  defaults,
  fileEnabled,
  fileUsage,
  recentFiles,
}: {
  remaining: number;
  maxPerExam: number;
  defaultLanguage?: string;
  labels: Labels;
  defaults?: Defaults;
  fileEnabled: boolean;
  fileUsage: FileQuotaStatus;
  recentFiles: RecentFile[];
}) {
  const [state, action, pending] = useActionState<NewExamState, FormData>(createExamAction, null);
  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    uploadFileAction,
    null
  );
  const [mode, setMode] = useState<GenerationMode>(defaults?.generationMode ?? "specialty");
  const [selectedFileId, setSelectedFileId] = useState<string>("");
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
  const numQDefault = Math.min(Math.max(1, defaults?.numQuestions ?? 5), maxPerExam);

  // After a successful upload, auto-select the file
  if (uploadState?.ok && uploadState.fileId && selectedFileId !== uploadState.fileId) {
    setSelectedFileId(uploadState.fileId);
  }

  return (
    <>
      {/* Upload form (separate from generate form because it submits a file) */}
      {fileEnabled && mode === "file" && (
        <form action={uploadAction} className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label className="block text-sm font-medium">Upload a new file</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              required
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-1 text-xs text-zinc-500">
              PDF, DOCX, TXT, or MD. Max 10 MB. {fileUsage ? `${fileUsage.remaining} of ${fileUsage.limit} uploads remaining this month.` : ""}
            </p>
          </div>
          {uploadState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {uploadState.error}
            </p>
          )}
          {uploadState?.ok && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Uploaded. Selected for the exam below.
            </p>
          )}
          <button
            type="submit"
            disabled={uploadPending || (fileUsage?.remaining ?? 0) < 1}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {uploadPending ? "Reading file…" : "Upload"}
          </button>
        </form>
      )}

      <form action={action} className="mt-6 space-y-5">
        {defaults && (defaults.specialty || defaults.examType) && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            Pre-filled from your last exam. Adjust anything you want before generating.
          </p>
        )}

        <div className="rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <div className={`grid grid-cols-2 ${fileEnabled ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-1 text-sm`}>
            <button
              type="button"
              onClick={() => setMode("specialty")}
              className={`rounded-md py-2.5 text-sm font-medium transition ${
                mode === "specialty" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {labels.bySpecialty}
            </button>
            <button
              type="button"
              onClick={() => setMode("exam")}
              className={`rounded-md py-2.5 text-sm font-medium transition ${
                mode === "exam" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {labels.byExam}
            </button>
            {fileEnabled && (
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`rounded-md py-2.5 text-sm font-medium transition ${
                  mode === "file" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                From file
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`rounded-md py-2.5 text-sm font-medium transition ${
                mode === "custom" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {mode === "specialty" && (
          <>
            <Field label={labels.specialty}>
              <select
                name="specialty"
                required
                defaultValue={specialtyDefault}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {SPECIALTY_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
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
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <input type="hidden" name="examType" value="" />
            <input type="hidden" name="sourceFileId" value="" />
          </>
        )}

        {mode === "exam" && (
          <>
            <Field label={labels.exam}>
              <select
                name="examType"
                required
                defaultValue={examTypeDefault}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={labels.specialtyOptional}>
                <select
                  name="specialty"
                  defaultValue={defaults?.specialty ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">{labels.any}</option>
                  {SPECIALTY_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label={labels.topicOptional}>
                <input
                  name="topic"
                  maxLength={120}
                  defaultValue={defaults?.topic ?? ""}
                  placeholder={labels.topicOptionalPlaceholder}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
            </div>
            <input type="hidden" name="sourceFileId" value="" />
          </>
        )}

        {mode === "file" && (
          <>
            <Field label="Source file">
              <select
                name="sourceFileId"
                required
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">— pick a file —</option>
                {recentFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename} ({Math.round(f.charCount / 100) / 10}k chars)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Questions will be generated strictly from this file&apos;s content. Upload a new file
                above if your file isn&apos;t in the list.
              </p>
            </Field>
            <Field label={labels.topicOptional}>
              <input
                name="topic"
                maxLength={120}
                defaultValue=""
                placeholder="e.g. Focus on chapter 3, or specific topic within the file"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <input type="hidden" name="specialty" value="" />
            <input type="hidden" name="examType" value="" />
          </>
        )}

        {mode === "custom" && (
          <>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <p className="font-medium">Build your own exam</p>
              <p className="mt-1 text-xs">
                Whether you&apos;re a paramedical or non-medical student, you can easily build your own
                exam. Choose your subject, set your difficulty, and generate questions that match your
                learning goals.
              </p>
            </div>
            <Field label="Subject / field of study">
              <input
                name="specialty"
                required
                minLength={2}
                maxLength={80}
                defaultValue={defaults?.generationMode === "custom" ? defaults?.specialty ?? "" : ""}
                placeholder="e.g. Nursing, Pharmacy Technology, Mathematics, Biology, Law"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <Field label="Topic / focus area">
              <input
                name="topic"
                required
                minLength={2}
                maxLength={120}
                defaultValue={defaults?.generationMode === "custom" ? defaults?.topic ?? "" : ""}
                placeholder="e.g. ECG basics for nurses, Linear algebra, Cell biology, Tort law"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <Field label="Audience">
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-300 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:has-[:checked]:bg-blue-950/40">
                  <input
                    type="radio"
                    name="audience"
                    value="PARAMEDICAL"
                    defaultChecked
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium">Paramedical / health sciences</span>
                    <span className="block text-xs text-zinc-500">
                      Nursing, pharmacy tech, lab, radiography, EMT, dietetics…
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-300 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:has-[:checked]:bg-blue-950/40">
                  <input
                    type="radio"
                    name="audience"
                    value="NONMEDICAL"
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium">Non-medical / general</span>
                    <span className="block text-xs text-zinc-500">
                      Math, sciences, languages, business, law, anything else.
                    </span>
                  </span>
                </label>
              </div>
            </Field>
            <input type="hidden" name="examType" value="" />
            <input type="hidden" name="sourceFileId" value="" />
          </>
        )}

        <Field label="Question format">
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-300 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:has-[:checked]:bg-blue-950/40">
              <input
                type="radio"
                name="questionFormat"
                value="MCQ"
                defaultChecked
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">MCQs</span>
                <span className="block text-xs text-zinc-500">Multiple choice — auto-graded</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-300 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:has-[:checked]:bg-blue-950/40">
              <input
                type="radio"
                name="questionFormat"
                value="TRUE_FALSE"
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">True / False</span>
                <span className="block text-xs text-zinc-500">Statements — auto-graded</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-300 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:has-[:checked]:bg-blue-950/40">
              <input
                type="radio"
                name="questionFormat"
                value="SHORT_NOTES"
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Short notes</span>
                <span className="block text-xs text-zinc-500">Open-ended — model answer shown</span>
              </span>
            </label>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={labels.difficulty}>
            <select
              name="difficulty"
              required
              defaultValue={difficultyDefault}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
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
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="PRACTICE">{labels.modePractice}</option>
              <option value="EXAM">{labels.modeExam}</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={labels.questionsMax.replace("{n}", String(maxPerExam))}>
            <input
              name="numQuestions"
              type="number"
              required
              min={1}
              max={maxPerExam}
              defaultValue={numQDefault}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label={labels.timeLimit}>
            <input
              name="timeLimitMin"
              type="number"
              min={0}
              max={240}
              placeholder={labels.timeLimitPlaceholder}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
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
          disabled={pending || !canGenerate || (mode === "file" && !selectedFileId)}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5 sm:text-sm"
        >
          {pending ? labels.generateLoading : labels.generate}
        </button>
        <p className="text-xs text-zinc-500">{labels.disclaimer}</p>
      </form>
    </>
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
