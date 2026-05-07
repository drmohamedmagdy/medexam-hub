"use client";

import { useActionState, useState } from "react";
import {
  createResearchProjectAction,
  type CreateResearchState,
} from "@/app/actions/research";

type Kind = "PROTOCOL" | "THESIS" | "MANUSCRIPT" | "SYSTEMATIC_REVIEW";

export default function NewProjectForm() {
  const [kind, setKind] = useState<Kind>("PROTOCOL");
  const [state, action, pending] = useActionState<CreateResearchState, FormData>(
    createResearchProjectAction,
    null
  );

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
        <Field label="Specialty">
          <input
            name="specialty"
            type="text"
            maxLength={120}
            placeholder="e.g. Endocrinology, Cardiology"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Study type">
          <input
            name="studyType"
            type="text"
            maxLength={120}
            placeholder="e.g. RCT, cross-sectional, case-control"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sample size">
          <input
            name="sampleSize"
            type="number"
            min={1}
            max={1_000_000}
            placeholder="e.g. 120"
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

      <Field label="Target population">
        <input
          name="population"
          type="text"
          maxLength={500}
          placeholder="e.g. Adults aged 40–70 with type 2 diabetes and Wagner grade II ulcers"
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

      <Field label="Notes for the AI (optional)">
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Anything specific you want included — funding source, intervention details, primary endpoint, etc."
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

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
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
