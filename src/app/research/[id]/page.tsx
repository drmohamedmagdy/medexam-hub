import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  deleteResearchProjectAction,
  deleteResearchFileAction,
} from "@/app/actions/research";
import { kindLabel as kindLabelFor, kindEmoji as kindEmojiFor } from "@/lib/research-templates";
import { parseCsv } from "@/lib/stats-engine";
import SectionsEditor from "./SectionsEditor";
import AttachFileButton from "./AttachFileButton";
import ProjectSettings from "./ProjectSettings";
import StatsPanel from "./StatsPanel";

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
      files: { orderBy: { createdAt: "asc" } },
      analyses: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project || project.userId !== user.id) redirect("/research");

  // Parse each attached file's CSV (best-effort) so the Stats panel can
  // populate column pickers without re-fetching.
  const filesForPicker = project.files.map((f) => {
    try {
      const csv = parseCsv(f.extractedText);
      const binaryValues: Record<string, string[]> = {};
      for (const col of csv.binaryColumns) {
        const idx = csv.columns.indexOf(col);
        const set = new Set<string>();
        for (const r of csv.rows) {
          const v = (r[idx] ?? "").trim();
          if (v) set.add(v);
        }
        binaryValues[col] = Array.from(set).sort();
      }
      return {
        id: f.id,
        filename: f.filename,
        columns: csv.columns,
        numericColumns: csv.numericColumns,
        categoricalColumns: csv.categoricalColumns,
        binaryColumns: csv.binaryColumns,
        binaryValues,
      };
    } catch {
      return {
        id: f.id,
        filename: f.filename,
        columns: [],
        numericColumns: [],
        categoricalColumns: [],
        binaryColumns: [],
        binaryValues: {} as Record<string, string[]>,
      };
    }
  });

  const completed = project.sections.filter(
    (s) => s.content.trim().length > 0 || (s.metadataJson && s.metadataJson.length > 0)
  ).length;
  const total = project.sections.length;
  const allComplete = total > 0 && completed === total;
  const kLabel = kindLabelFor(project.kind);
  const kEmoji = kindEmojiFor(project.kind);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/research" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Research projects
      </Link>

      <header className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
              {kEmoji} {kLabel}
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
            {allComplete ? (
              <>
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
              </>
            ) : (
              <>
                <span
                  aria-disabled
                  title={`Generate all ${total} sections first (${total - completed} left)`}
                  className="cursor-not-allowed rounded-md bg-zinc-200 px-4 py-2 font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                >
                  📄 Download .docx
                </span>
                <span
                  aria-disabled
                  title={`Generate all ${total} sections first (${total - completed} left)`}
                  className="cursor-not-allowed rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                >
                  🖨 Print / PDF
                </span>
              </>
            )}
            <ProjectSettings
              project={{
                id: project.id,
                kind: project.kind,
                title: project.title,
                specialty: project.specialty,
                studyType: project.studyType,
                sampleSize: project.sampleSize,
                population: project.population,
                university: project.university,
                language: project.language,
                citationStyle: project.citationStyle,
                notes: project.notes,
              }}
            />
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
              className={`h-full transition-all ${
                allComplete ? "bg-emerald-600" : "bg-blue-600"
              }`}
              style={{ width: `${total === 0 ? 0 : (completed / total) * 100}%` }}
            />
          </div>
          {allComplete ? (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              ✓ All sections complete — your manuscript is ready to download.
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              ⏳ Generate the remaining {total - completed} section{total - completed === 1 ? "" : "s"} below — downloads unlock when all sections are written.
            </p>
          )}
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">📎 Data files</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Attach CSV / Excel / PDF / Word files. Their text is fed into AI section
              generation so Methods, Results, and Statistical Analysis can reference
              your actual data.
            </p>
          </div>
          <AttachFileButton projectId={project.id} />
        </div>
        {project.files.length > 0 ? (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
            {project.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <a
                    href={f.fileUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium hover:text-blue-600"
                  >
                    {f.filename}
                  </a>
                  <div className="text-xs text-zinc-500">
                    {(f.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                    {f.charCount.toLocaleString()} chars extracted
                  </div>
                </div>
                <form action={deleteResearchFileAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
            No files attached yet. AI sections will be generated from project metadata
            only — attach a CSV with your data so the Statistical Analysis and Results
            sections can quote real numbers.
          </p>
        )}
      </section>

      <StatsPanel
        projectId={project.id}
        files={filesForPicker.filter((f) => f.columns.length > 0)}
        analyses={project.analyses.map((a) => ({
          id: a.id,
          kind: a.kind,
          title: a.title,
          configJson: a.configJson,
          resultJson: a.resultJson,
          resultSvg: a.resultSvg,
          computedAt: a.computedAt?.toISOString() ?? null,
        }))}
      />

      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          metadataJson: s.metadataJson,
          orderIndex: s.orderIndex,
          generatedAt: s.generatedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
