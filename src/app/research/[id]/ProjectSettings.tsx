"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateResearchProjectAction,
  type UpdateResearchState,
} from "@/app/actions/research";
import type { ResearchKind } from "@/generated/prisma/client";

type Project = {
  id: string;
  kind: ResearchKind;
  title: string;
  specialty: string | null;
  studyType: string | null;
  sampleSize: number | null;
  population: string | null;
  university: string | null;
  language: string;
  citationStyle: string;
  notes: string | null;
};

function hintsFor(kind: ResearchKind) {
  switch (kind) {
    case "SYSTEMATIC_REVIEW":
      return {
        studyType: { label: "Review type", placeholder: "e.g. Systematic review, scoping review, meta-analysis" },
        sampleSize: {
          label: "Estimated number of included studies",
          placeholder: "e.g. 25",
          help: "Optional. Leave blank if you don't know yet.",
        },
        population: {
          label: "Population / setting (P of PICO)",
          placeholder: "e.g. Adults with type 2 diabetes presenting with foot ulcers",
        },
      };
    case "MANUSCRIPT":
      return {
        studyType: {
          label: "Study design",
          placeholder: "e.g. RCT, cohort, cross-sectional, in vitro, animal model",
        },
        sampleSize: {
          label: "Sample size / specimens",
          placeholder: "e.g. 120 patients, or 60 cell-line replicates",
          help: "Optional. Use whichever unit fits.",
        },
        population: {
          label: "Sample description",
          placeholder: "e.g. Adults aged 40–70 with chronic ulcers, or HUVEC cells",
        },
      };
    case "THESIS":
      return {
        studyType: {
          label: "Study design",
          placeholder: "e.g. RCT, observational, qualitative, lab experiment",
        },
        sampleSize: {
          label: "Sample size / scope",
          placeholder: "e.g. 100 participants, or 12 in-depth interviews",
          help: "Optional.",
        },
        population: {
          label: "Sample description",
          placeholder: "e.g. Postgraduate students, or rats fed a high-fat diet",
        },
      };
    case "PROTOCOL":
    default:
      return {
        studyType: {
          label: "Study design",
          placeholder: "e.g. RCT, cohort, lab experiment, qualitative",
        },
        sampleSize: {
          label: "Sample size / scope",
          placeholder: "e.g. 120, or 30 specimens",
          help: "Optional.",
        },
        population: {
          label: "Target population / sample",
          placeholder: "e.g. Adults aged 40–70 with type 2 diabetes; or zebrafish embryos",
        },
      };
  }
}

export default function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UpdateResearchState, FormData>(
    updateResearchProjectAction,
    null
  );
  const hints = hintsFor(project.kind);

  if (state?.ok && open) {
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ⚙ Edit settings
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-3 w-full rounded-2xl border border-blue-300 bg-white p-5 dark:border-cyan-700/60 dark:bg-zinc-900 sm:p-6"
    >
      <input type="hidden" name="id" value={project.id} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">⚙ Edit project settings</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:underline"
        >
          Cancel
        </button>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Changes apply to future section generations. Already-written sections stay as they are
        until you regenerate them.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Title" required>
          <input
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={200}
            defaultValue={project.title}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Specialty / field">
            <input
              name="specialty"
              type="text"
              maxLength={120}
              defaultValue={project.specialty ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label={hints.studyType.label}>
            <input
              name="studyType"
              type="text"
              maxLength={120}
              placeholder={hints.studyType.placeholder}
              defaultValue={project.studyType ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={hints.sampleSize.label} hint={hints.sampleSize.help}>
            <input
              name="sampleSize"
              type="number"
              min={0}
              max={1_000_000}
              placeholder={hints.sampleSize.placeholder}
              defaultValue={project.sampleSize ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label="University / institution">
            <input
              name="university"
              type="text"
              maxLength={200}
              defaultValue={project.university ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>

        <Field label={hints.population.label}>
          <input
            name="population"
            type="text"
            maxLength={500}
            placeholder={hints.population.placeholder}
            defaultValue={project.population ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Output language">
            <select
              name="language"
              defaultValue={project.language}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="English">English</option>
              <option value="Arabic">Arabic</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
              <option value="Italian">Italian</option>
              <option value="Portuguese">Portuguese</option>
              <option value="Turkish">Turkish</option>
            </select>
          </Field>
          <Field label="Citation style">
            <select
              name="citationStyle"
              defaultValue={project.citationStyle}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="vancouver">Vancouver</option>
              <option value="apa">APA</option>
              <option value="mla">MLA</option>
            </select>
          </Field>
        </div>

        <Field label="Notes for the AI">
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={project.notes ?? ""}
            placeholder="Free-form context that's used on every section."
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
