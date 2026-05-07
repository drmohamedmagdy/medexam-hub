import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteResearchProjectAction } from "@/app/actions/research";
import SectionsEditor from "./SectionsEditor";

export const metadata = { title: "Research project — MedExam Hub" };

export default async function ResearchProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!project || project.userId !== user.id) redirect("/research");

  const completed = project.sections.filter((s) => s.content.trim().length > 0).length;
  const total = project.sections.length;
  const kindLabel = project.kind === "PROTOCOL" ? "Research protocol" : "Thesis";
  const kindEmoji = project.kind === "PROTOCOL" ? "📋" : "📚";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/research" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Research projects
      </Link>

      <header className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
              {kindEmoji} {kindLabel}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
            <p className="mt-2 text-xs text-zinc-500">
              {[
                project.specialty,
                project.studyType,
                project.sampleSize ? `n = ${project.sampleSize}` : null,
                project.university,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {project.language} · {project.citationStyle.toUpperCase()} citations
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={`/research/${project.id}/export`}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              📄 Download .docx
            </Link>
            <Link
              href={`/research/${project.id}/print`}
              target="_blank"
              className="rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              🖨 Print / PDF
            </Link>
            <form action={deleteResearchProjectAction}>
              <input type="hidden" name="id" value={project.id} />
              <button
                type="submit"
                className="rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              {completed} / {total} sections written
            </span>
            <span className="font-mono font-semibold">
              {total === 0 ? 0 : Math.round((completed / total) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${total === 0 ? 0 : (completed / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          orderIndex: s.orderIndex,
          generatedAt: s.generatedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
