import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";
import NewProjectForm from "./NewProjectForm";

export const metadata = { title: "New research project — MedExam Hub" };

export default async function NewResearchPage() {
  const user = await requireUser();
  const allowed = canUseResearch(user.plan);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/research" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Research projects
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New research project</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pick a protocol or thesis. We&apos;ll create the section skeleton — you generate
        each section with AI, edit, then export to Word.
      </p>
      {!allowed && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40">
          <p className="font-semibold text-violet-900 dark:text-violet-200">
            🔒 Researcher plan required
          </p>
          <p className="mt-1 text-violet-900 dark:text-violet-200">
            You can preview the form, but creating a project — and generating any
            section, running statistical tests, uploading data files, or exporting
            a Word document — needs the Researcher plan.
          </p>
          <Link
            href="/plans"
            className="mt-3 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Upgrade to Researcher →
          </Link>
        </div>
      )}
      <NewProjectForm />
    </div>
  );
}
