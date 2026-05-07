"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createResearchProjectAction,
  type CreateResearchState,
} from "@/app/actions/research";

const UPGRADE_REQUIRED_PREFIX = "[UPGRADE_REQUIRED] ";
const QUOTA_RESEARCH_PREFIX = "[QUOTA_RESEARCH] ";

const RESEARCH_PROJECT_TOPUP_EGP = 500;

type Kind = "PROTOCOL" | "THESIS" | "MANUSCRIPT" | "SYSTEMATIC_REVIEW";

type FieldHints = {
  studyType: { label: string; placeholder: string };
  sampleSize: { label: string; placeholder: string; help: string };
  population: { label: string; placeholder: string };
};

function hintsFor(kind: Kind): FieldHints {
  switch (kind) {
    case "SYSTEMATIC_REVIEW":
      return {
        studyType: {
          label: "Review type",
          placeholder: "e.g. Systematic review, scoping review, meta-analysis",
        },
        sampleSize: {
          label: "Estimated number of included studies",
          placeholder: "e.g. 25",
          help: "Optional. Leave blank if you don't know yet — Methods and Results will adapt.",
        },
        population: {
          label: "Population / setting (P of PICO)",
          placeholder:
            "e.g. Adults with type 2 diabetes presenting with foot ulcers in any clinical setting",
        },
      };
    case "MANUSCRIPT":
      return {
        studyType: {
          label: "Study design",
          placeholder:
            "e.g. RCT, prospective cohort, cross-sectional, case-control, in vitro experiment, animal model",
        },
        sampleSize: {
          label: "Sample size / number of specimens",
          placeholder: "e.g. 120 patients, or 60 cell-line replicates",
          help: "Optional. Use whichever unit fits your study (patients, animals, samples, etc.).",
        },
        population: {
          label: "Sample description",
          placeholder:
            "e.g. Adults aged 40–70 with chronic ulcers, or HUVEC cells exposed to high glucose",
        },
      };
    case "THESIS":
      return {
        studyType: {
          label: "Study design",
          placeholder:
            "e.g. RCT, observational, qualitative, narrative review, lab experiment",
        },
        sampleSize: {
          label: "Sample size / scope",
          placeholder: "e.g. 100 participants, or 12 in-depth interviews",
          help: "Optional. Whatever unit makes sense for your thesis.",
        },
        population: {
          label: "Sample description",
          placeholder:
            "e.g. Postgraduate students at Cairo University, or rats fed a high-fat diet",
        },
      };
    case "PROTOCOL":
    default:
      return {
        studyType: {
          label: "Study design",
          placeholder:
            "e.g. RCT, cohort, case-control, cross-sectional, lab experiment, qualitative",
        },
        sampleSize: {
          label: "Sample size / scope",
          placeholder: "e.g. 120, or 30 specimens",
          help: "Optional — used in the Methodology and Sample Size Justification sections.",
        },
        population: {
          label: "Target population / sample",
          placeholder:
            "e.g. Adults aged 40–70 with type 2 diabetes; or zebrafish embryos at 3 dpf",
        },
      };
  }
}

function ErrorOrCTA({ error }: { error: string }) {
  if (error.startsWith(UPGRADE_REQUIRED_PREFIX)) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-800 dark:bg-violet-950/40">
        <p className="font-semibold text-violet-900 dark:text-violet-200">
          ✨ Researcher plan required
        </p>
        <p className="mt-1 text-violet-900 dark:text-violet-300">
          {error.slice(UPGRADE_REQUIRED_PREFIX.length)}
        </p>
        <Link
          href="/plans"
          className="mt-3 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Upgrade to Researcher →
        </Link>
      </div>
    );
  }
  if (error.startsWith(QUOTA_RESEARCH_PREFIX)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          📊 Monthly project quota reached
        </p>
        <p className="mt-1 text-amber-900 dark:text-amber-300">
          {error.slice(QUOTA_RESEARCH_PREFIX.length)} You can buy a top-up to
          continue right now — <strong>{RESEARCH_PROJECT_TOPUP_EGP} EGP</strong>{" "}
          per extra project — or wait until next month.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/account/subscription#topups"
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Buy {RESEARCH_PROJECT_TOPUP_EGP}-credit top-up →
          </Link>
          <Link
            href="/plans"
            className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/60"
          >
            See plans
          </Link>
        </div>
      </div>
    );
  }
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {error}
    </p>
  );
}

export default function NewProjectForm() {
  const [kind, setKind] = useState<Kind>("PROTOCOL");
  const [state, action, pending] = useActionState<CreateResearchState, FormData>(
    createResearchProjectAction,
    null
  );
  const hints = hintsFor(kind);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="kind" value={kind} />

      <fieldset>
        <legend className="text-sm font-medium">What are you building?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <KindOption
            checked={kind === "PROTOCOL"}
            onSelect={() => setKind("PROTOCOL")}
            emoji="📋"
            label="Research protocol"
            sub="Master's / PhD protocol — 9 sections, for ethics submission."
          />
          <KindOption
            checked={kind === "THESIS"}
            onSelect={() => setKind("THESIS")}
            emoji="📚"
            label="Full thesis"
            sub="6 chapters + references — Intro, Lit Review, Methods, Results, Discussion."
          />
          <KindOption
            checked={kind === "MANUSCRIPT"}
            onSelect={() => setKind("MANUSCRIPT")}
            emoji="📄"
            label="Journal manuscript"
            sub="IMRaD paper for submission — title page, structured abstract, methods, results, discussion."
          />
          <KindOption
            checked={kind === "SYSTEMATIC_REVIEW"}
            onSelect={() => setKind("SYSTEMATIC_REVIEW")}
            emoji="🔬"
            label="Systematic review / meta-analysis"
            sub="PRISMA-aligned — PICO abstract, search strategy, PRISMA flow diagram, narrative + meta-analysis."
          />
        </div>
      </fieldset>

      <Field label="Title" required>
        <input
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="e.g. Effect of Empagliflozin on Diabetic Foot Ulcer Healing in Type 2 Diabetes"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Specialty / field">
          <input
            name="specialty"
            type="text"
            maxLength={120}
            placeholder="e.g. Endocrinology, Public Health, Molecular Biology"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label={hints.studyType.label}>
          <input
            name="studyType"
            type="text"
            maxLength={120}
            placeholder={hints.studyType.placeholder}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={hints.sampleSize.label} hint={hints.sampleSize.help}>
          <input
            name="sampleSize"
            type="number"
            min={0}
            max={1_000_000}
            placeholder={hints.sampleSize.placeholder}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="University / institution">
          <input
            name="university"
            type="text"
            maxLength={200}
            placeholder="e.g. Cairo University"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <Field label={hints.population.label}>
        <input
          name="population"
          type="text"
          maxLength={500}
          placeholder={hints.population.placeholder}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Output language">
          <select
            name="language"
            defaultValue="English"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
            defaultValue="vancouver"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="vancouver">Vancouver</option>
            <option value="apa">APA</option>
            <option value="mla">MLA</option>
          </select>
        </Field>
      </div>

      <Field
        label="Notes for the AI (optional)"
        hint="Anything specific you want included — funding source, intervention details, primary endpoint, lab equipment, exclusion criteria details, etc."
      >
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Free-form. The AI uses this on every section it generates."
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        💡 You can edit any of these settings later from the project page —
        sample size, design, language, citation style, even the title — and
        regenerate sections to use the new context.
      </p>

      {state?.error && <ErrorOrCTA error={state.error} />}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:py-2.5"
      >
        {pending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}

function KindOption({
  checked,
  onSelect,
  emoji,
  label,
  sub,
}: {
  checked: boolean;
  onSelect: () => void;
  emoji: string;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`flex flex-col items-start gap-1 rounded-lg border-2 px-4 py-3 text-left transition ${
        checked
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-zinc-500">{sub}</span>
    </button>
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
