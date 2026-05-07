import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/stats-engine";
import StatsClient from "./StatsClient";

export const metadata = { title: "Statistics — MedExam Hub" };

export default async function StatisticsPage() {
  const user = await requireUser();

  let workspace = await prisma.statsWorkspace.findUnique({
    where: { userId: user.id },
    include: { analyses: { orderBy: { createdAt: "asc" } } },
  });
  if (!workspace) {
    workspace = await prisma.statsWorkspace.create({
      data: { userId: user.id },
      include: { analyses: { orderBy: { createdAt: "asc" } } },
    });
  }

  // Pre-parse columns for the on-screen pickers.
  let columns: string[] = [];
  let numericColumns: string[] = [];
  let categoricalColumns: string[] = [];
  if (workspace.extractedText) {
    try {
      const csv = parseCsv(workspace.extractedText);
      columns = csv.columns;
      numericColumns = csv.numericColumns;
      categoricalColumns = csv.categoricalColumns;
    } catch {
      // Leave columns empty — UI will show a parse warning.
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">📊 Statistics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Standalone tool: upload a CSV (or anything we can extract text from),
            run descriptive stats, group comparisons, correlations, and
            histograms. Download the report as a Word document. No research
            project required.
          </p>
        </div>
        {workspace.fileUrl && workspace.analyses.length > 0 && (
          <Link
            href="/statistics/export"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            📄 Download report
          </Link>
        )}
      </header>

      <StatsClient
        hasFile={Boolean(workspace.extractedText)}
        filename={workspace.filename}
        sizeBytes={workspace.sizeBytes}
        charCount={workspace.charCount}
        uploadedAt={workspace.uploadedAt?.toISOString() ?? null}
        columns={columns}
        numericColumns={numericColumns}
        categoricalColumns={categoricalColumns}
        analyses={workspace.analyses.map((a) => ({
          id: a.id,
          kind: a.kind,
          title: a.title,
          configJson: a.configJson,
          resultJson: a.resultJson,
          resultSvg: a.resultSvg,
          computedAt: a.computedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
