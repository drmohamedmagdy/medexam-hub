import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/stats-engine";
import StatsClient from "./StatsClient";

export const metadata = { title: "Statistics — MedExam Hub" };

export default async function StatisticsPage() {
  const user = await requireUser();
  const allowed = canUseResearch(user.plan);

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
  let binaryColumns: string[] = [];
  let binaryValues: Record<string, string[]> = {};
  if (workspace.extractedText) {
    try {
      const csv = parseCsv(workspace.extractedText);
      columns = csv.columns;
      numericColumns = csv.numericColumns;
      categoricalColumns = csv.categoricalColumns;
      binaryColumns = csv.binaryColumns;
      for (const col of csv.binaryColumns) {
        const idx = csv.columns.indexOf(col);
        const set = new Set<string>();
        for (const r of csv.rows) {
          const v = (r[idx] ?? "").trim();
          if (v) set.add(v);
        }
        binaryValues[col] = Array.from(set).sort();
      }
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
        {allowed && workspace.fileUrl && workspace.analyses.length > 0 && (
          <Link
            href="/statistics/export"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            📄 Download report
          </Link>
        )}
      </header>

      {!allowed && (
        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/40">
          <h2 className="text-base font-semibold text-violet-900 dark:text-violet-200">
            ✨ Researcher plan required
          </h2>
          <p className="mt-1 text-sm text-violet-900 dark:text-violet-300">
            Have a look around. Uploading data, running any of the 17 statistical
            tests, and exporting reports require the Researcher plan.
          </p>
          <Link
            href="/plans"
            className="mt-3 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Upgrade to Researcher →
          </Link>
        </div>
      )}

      <StatsClient
        hasFile={Boolean(workspace.extractedText)}
        filename={workspace.filename}
        sizeBytes={workspace.sizeBytes}
        charCount={workspace.charCount}
        uploadedAt={workspace.uploadedAt?.toISOString() ?? null}
        columns={columns}
        numericColumns={numericColumns}
        categoricalColumns={categoricalColumns}
        binaryColumns={binaryColumns}
        binaryValues={binaryValues}
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
