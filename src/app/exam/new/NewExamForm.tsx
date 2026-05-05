"use client";

import { useActionState, useEffect, useState } from "react";
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

// Generic 4-level scale shown for File and Custom tabs, where the medical-
// specific labels (Intern, Resident, Consultant…) don't apply to non-medical
// content. Each generic level maps to a Difficulty enum value so the DB and
// AI prompt logic stay unchanged.
function genericDifficulty(labels: Labels): ReadonlyArray<{ value: Difficulty; label: string }> {
  return [
    { value: "BEGINNER", label: labels.genericBeginner },
    { value: "INTERN", label: labels.genericIntermediate },
    { value: "SPECIALIST", label: labels.genericAdvanced },
    { value: "BOARD", label: labels.genericExpert },
  ];
}

const GENERIC_VALUES = new Set<Difficulty>(["BEGINNER", "INTERN", "SPECIALIST", "BOARD"]);

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
  hasSummary: boolean;
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
  const useGenericDifficulty = mode === "file" || mode === "custom";
  const canGenerate = remaining >= 1;

  const langDefault = findLanguage(defaults?.language ?? defaultLanguage ?? DEFAULT_LANGUAGE)
    ? (defaults?.language ?? defaultLanguage ?? DEFAULT_LANGUAGE)
    : DEFAULT_LANGUAGE;

  const specialtyDefault =
    defaults?.specialty && SPECIALTIES.includes(defaults.specialty as (typeof SPECIALTIES)[number])
      ? defaults.specialty
      : "";

  const examTypeDefault =
    defaults?.examType && getAllExamTypeIds().includes(defaults.examType)
      ? defaults.examType
      : "USMLE Step 2 CK";

  const difficultyDefault = defaults?.difficulty ?? "RESIDENT";
  const modeDefault = defaults?.mode ?? "PRACTICE";
  const numQDefault = Math.min(Math.max(1, defaults?.numQuestions ?? 5), maxPerExam);

  // Controlled difficulty so the select stays valid when the user switches
  // between medical (7-level) and generic (4-level) tabs.
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => coerceDifficulty(difficultyDefault, mode === "file" || mode === "custom")
  );
  // On tab change, coerce any stale value to the closest equivalent in the
  // new scale (e.g. switching from medical "Resident" → generic "Advanced").
  useEffect(() => {
    setDifficulty((prev) => coerceDifficulty(prev, useGenericDifficulty));
  }, [useGenericDifficulty]);

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
            <label className="block text-sm font-medium">{labels.uploadNew}</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              required
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {labels.uploadHint}{fileUsage ? ` ${labels.uploadRemaining.replace("{remaining}", String(fileUsage.remaining)).replace("{limit}", String(fileUsage.limit))}` : ""}
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800/40 dark:has-[:checked]:bg-blue-950/40">
            <input
              type="checkbox"
              name="generateSummary"
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">{labels.summaryOptionTitle}</span>
              <span className="block text-xs text-zinc-500">{labels.summaryOptionHint}</span>
            </span>
          </label>
          {uploadState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {uploadState.error}
            </p>
          )}
          {uploadState?.ok && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {labels.uploadDone}
              {uploadState.summaryFailed && (
                <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                  {labels.summaryFailed}
                </span>
              )}
            </p>
          )}
          <button
            type="submit"
            disabled={uploadPending || (fileUsage?.remaining ?? 0) < 1}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {uploadPending ? labels.uploadReading : labels.uploadButton}
          </button>
        </form>
      )}

      <form action={action} className="mt-6 space-y-5">
        {defaults && (defaults.specialty || defaults.examType) && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            {labels.prefilledNote}
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
                {labels.tabFile}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`rounded-md py-2.5 text-sm font-medium transition ${
                mode === "custom" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {labels.tabCustom}
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
                <option value="" disabled>
                  {labels.specialty}…
                </option>
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
            <Field label={labels.sourceFile}>
              <select
                name="sourceFileId"
                required
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">{labels.pickFile}</option>
                {recentFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename} ({Math.round(f.charCount / 100) / 10}k chars)
                    {f.hasSummary ? " · 📄" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                {labels.fileExplain}
              </p>
              <SummaryLinks file={recentFiles.find((f) => f.id === selectedFileId) ?? null} labels={labels} />
            </Field>
            <Field label={labels.topicOptional}>
              <input
                name="topic"
                maxLength={120}
                defaultValue=""
                placeholder={labels.fileTopicPlaceholder}
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
              <p className="font-medium">{labels.customTitle}</p>
              <p className="mt-1 text-xs">
                {labels.customExplain}
              </p>
            </div>
            <Field label={labels.subject}>
              <input
                name="specialty"
                required
                minLength={2}
                maxLength={80}
                defaultValue={defaults?.generationMode === "custom" ? defaults?.specialty ?? "" : ""}
                placeholder={labels.subjectPlaceholder}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <Field label={labels.topicArea}>
              <input
                name="topic"
                required
                minLength={2}
                maxLength={120}
                defaultValue={defaults?.generationMode === "custom" ? defaults?.topic ?? "" : ""}
                placeholder={labels.topicAreaPlaceholder}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <Field label={labels.audience}>
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
                    <span className="block font-medium">{labels.audienceParamedical}</span>
                    <span className="block text-xs text-zinc-500">
                      {labels.audienceParamedicalSub}
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
                    <span className="block font-medium">{labels.audienceNonmedical}</span>
                    <span className="block text-xs text-zinc-500">
                      {labels.audienceNonmedicalSub}
                    </span>
                  </span>
                </label>
              </div>
            </Field>
            <input type="hidden" name="examType" value="" />
            <input type="hidden" name="sourceFileId" value="" />
          </>
        )}

        <Field label={labels.questionFormat}>
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
                <span className="block font-medium">{labels.qfMcq}</span>
                <span className="block text-xs text-zinc-500">{labels.qfMcqSub}</span>
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
                <span className="block font-medium">{labels.qfTrueFalse}</span>
                <span className="block text-xs text-zinc-500">{labels.qfTrueFalseSub}</span>
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
                <span className="block font-medium">{labels.qfShortNotes}</span>
                <span className="block text-xs text-zinc-500">{labels.qfShortNotesSub}</span>
              </span>
            </label>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={labels.difficulty}>
            <select
              name="difficulty"
              required
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {useGenericDifficulty
                ? genericDifficulty(labels).map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))
                : DIFFICULTY_KEYS.map((k) => (
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

/**
 * Coerce a Difficulty value to the closest equivalent in the active scale.
 * Used when the user switches between medical (7-level) and generic (4-level)
 * scales — we want STUDENT → BEGINNER, RESIDENT → INTERN (intermediate), etc.
 */
function coerceDifficulty(value: Difficulty, generic: boolean): Difficulty {
  if (!generic) return value; // medical scale accepts all 7
  if (GENERIC_VALUES.has(value)) return value;
  // Map 7-level → 4-level
  switch (value) {
    case "STUDENT":
      return "BEGINNER";
    case "RESIDENT":
      return "INTERN"; // = "Intermediate"
    case "CONSULTANT":
      return "BOARD"; // = "Expert"
    default:
      return "INTERN";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function SummaryLinks({
  file,
  labels,
}: {
  file: RecentFile | null;
  labels: Labels;
}) {
  if (!file || !file.hasSummary) return null;
  const summaryHref = `/file/${file.id}/summary`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
      <span aria-hidden>📄</span>
      <span className="font-medium text-emerald-900 dark:text-emerald-200">{labels.summaryReady}</span>
      <a
        href={summaryHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
      >
        {labels.summaryView}
      </a>
      <a
        href={`${summaryHref}?print=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
      >
        {labels.summaryDownload}
      </a>
    </div>
  );
}
