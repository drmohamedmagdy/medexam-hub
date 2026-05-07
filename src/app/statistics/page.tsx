import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/stats-engine";
import StatsClient from "./StatsClient";

export const metadata = { title: "Statistics — MedExam Hub" };

export default async function StatisticsPage() {
  const user = await requireUser();

  if (!canUseResearch(user.plan)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">📊 Statistics</h1>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Statistics is part of the Research &amp; Statistics suite.
          </p>
          <p className="mt-2 text-amber-900 dark:text-amber-200">
            Upload a CSV/Excel file and run any of 17 tests (descriptives, t-tests,
            ANOVA, chi-square, regression, Kaplan–Meier, ROC, etc.). Available on the{" "}
            <strong>Researcher</strong> plan (unlimited) or <strong>Premium</strong>{" "}
            (the AI section generation costs credits; statistical analyses are free
            once you're on the plan).
          </p>
          <Link
            href="/plans"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            See plans →
          </Link>
        </div>
      </div>
    );
  }

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
