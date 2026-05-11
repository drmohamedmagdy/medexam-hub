import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/specialties";
import { EXAM_TYPE_GROUPS } from "@/lib/exam-types";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import NewNoteForm from "./NewNoteForm";

export const metadata = { title: "New study note — MedExam Hub" };

export default async function NewNotePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/notes" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; My notes
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        ✨ Generate a study note
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pick a topic and we&apos;ll write a concise, exam-focused summary
        you can review in 5 minutes.
      </p>

      <div className="mt-8">
        <NewNoteForm
          specialties={SPECIALTIES.slice()}
          examTypes={EXAM_TYPE_GROUPS.flatMap((g) =>
            g.exams.map((e) => ({ value: e.id, label: e.label }))
          )}
          locales={LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
        />
      </div>
    </div>
  );
}
