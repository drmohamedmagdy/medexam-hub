"use client";

import { useActionState } from "react";
import {
  submitAmbassadorApplicationAction,
  type AmbassadorApplyState,
} from "@/app/actions/ambassador";

export default function AmbassadorForm() {
  const [state, action, pending] = useActionState<AmbassadorApplyState, FormData>(
    submitAmbassadorApplicationAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/40">
        <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
          🎉 Application received
        </h3>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
          Thanks for applying — we&apos;ll review and respond within 2 weeks
          at the email you provided. In the meantime, feel free to
          explore the app on the Free plan.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <Field
        id="name"
        label="Full name"
        type="text"
        required
        placeholder="Mohamed Magdy"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Email" type="email" required placeholder="you@school.edu" />
        <Field id="phone" label="Phone (optional)" type="tel" placeholder="01012345678" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="medicalSchool"
          label="Medical school"
          type="text"
          required
          placeholder="Cairo University Faculty of Medicine"
        />
        <YearField />
      </div>
      <Field
        id="socialLinks"
        label="Social / group links (optional)"
        type="text"
        placeholder="Telegram @yourhandle, Instagram, Twitter…"
        hint="Tell us where you're active so we can see your reach."
      />
      <div>
        <label htmlFor="motivation" className="block text-sm font-medium">
          Why do you want to be an ambassador?
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Tell us about your study groups, your year, what you've done to
          help your batch before. Even one paragraph is fine.
        </p>
        <textarea
          id="motivation"
          name="motivation"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          placeholder="I'm in 5th year at Cairo Med, admin of our year's Telegram group (1,200 members)…"
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        By submitting, you agree to be contacted by MedExam Hub regarding
        this application.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  required,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  );
}

function YearField() {
  return (
    <div>
      <label htmlFor="yearOfStudy" className="block text-sm font-medium">
        Year of study <span className="text-red-600">*</span>
      </label>
      <select
        id="yearOfStudy"
        name="yearOfStudy"
        required
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        defaultValue=""
      >
        <option value="" disabled>
          Select…
        </option>
        <option value="1st year">1st year</option>
        <option value="2nd year">2nd year</option>
        <option value="3rd year">3rd year</option>
        <option value="4th year">4th year</option>
        <option value="5th year">5th year</option>
        <option value="6th year">6th year</option>
        <option value="Intern">Intern</option>
        <option value="Resident">Resident</option>
        <option value="Specialist">Specialist / Consultant</option>
      </select>
    </div>
  );
}
