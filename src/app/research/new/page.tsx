import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";
import NewProjectForm from "./NewProjectForm";

export const metadata = { title: "New research project — MedExam Hub" };

export default async function NewResearchPage() {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) redirect("/research");

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
      <NewProjectForm />
    </div>
  );
}
