"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import {
  replaceStatsFileAction,
  clearStatsFileAction,
  addStatsAnalysisAction,
  deleteStatsAnalysisAction,
  type StatsState,
  type StatsAnalysisState,
} from "@/app/actions/statistics";
import {
  fmt,
  fmtP,
  type CorrelationCell,
  type DescriptiveRow,
  type GroupMeansRow,
  type HistogramBins,
  type TTestResult,
} from "@/lib/stats-engine";

type AnalysisKind = "descriptives" | "compare_means" | "correlation" | "histogram";

type AnalysisForView = {
  id: string;
  kind: string;
  title: string;
  configJson: string;
  resultJson: string | null;
  resultSvg: string | null;
  computedAt: string | null;
};

export default function StatsClient({
  hasFile,
  filename,
  sizeBytes,
  charCount,
  uploadedAt,
  columns,
  numericColumns,
  categoricalColumns,
  analyses,
}: {
  hasFile: boolean;
  filename: string | null;
  sizeBytes: number | null;
  charCount: number | null;
  uploadedAt: string | null;
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  analyses: AnalysisForView[];
}) {
  return (
    <div className="mt-6 space-y-5">
      <FilePanel
        hasFile={hasFile}
        filename={filename}
        sizeBytes={sizeBytes}
        charCount={charCount}
        uploadedAt={uploadedAt}
        numericColumns={numericColumns}
        categoricalColumns={categoricalColumns}
      />
      {hasFile && columns.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          We couldn&apos;t parse this file as a CSV. Try saving your spreadsheet as
          .csv (UTF-8, comma-separated) and uploading again.
        </p>
      )}
      {hasFile && columns.length > 0 && (
        <>
          <AddAnalysisForm
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
          />
          {analyses.length > 0 && (
            <ul className="space-y-4">
              {analyses.map((a) => (
                <li key={a.id}>
                  <AnalysisCard analysis={a} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilePanel({
  hasFile,
  filename,
  sizeBytes,
  charCount,
  uploadedAt,
  numericColumns,
  categoricalColumns,
}: {
  hasFile: boolean;
  filename: string | null;
  sizeBytes: number | null;
  charCount: number | null;
  uploadedAt: string | null;
  numericColumns: string[];
  categoricalColumns: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, replaceAction, replacePending] = useActionState<StatsState, FormData>(
    replaceStatsFileAction,
    null
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const blob = await upload(`statistics/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/statistics/upload",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const fd = new FormData();
      fd.set("fileUrl", blob.url);
      fd.set("filePathname", blob.pathname);
      fd.set("filename", file.name);
      fd.set("mimeType", file.type || "application/octet-stream");
      fd.set("sizeBytes", String(file.size));
      const result = await replaceStatsFileAction(null, fd);
      if (!result?.ok) throw new Error(result?.error ?? "Upload failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
      e.target.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">📎 Data file</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Upload a CSV. We&apos;ll auto-detect numeric vs categorical columns.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
          {hasFile ? "Replace file" : "+ Upload CSV"}
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.docx,.doc"
            onChange={onPick}
            disabled={busy || replacePending}
            className="sr-only"
          />
        </label>
      </div>

      {busy && (
        <p className="mt-3 text-xs text-zinc-500">Uploading {progress}%</p>
      )}
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {hasFile ? (
        <div className="mt-4 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
          <p>
            <strong>{filename}</strong> ·{" "}
            {sizeBytes ? `${(sizeBytes / 1024).toFixed(0)} KB · ` : ""}
            {charCount?.toLocaleString() ?? 0} chars extracted
            {uploadedAt && ` · uploaded ${new Date(uploadedAt).toLocaleString()}`}
          </p>
          {(numericColumns.length > 0 || categoricalColumns.length > 0) && (
            <div className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
              {numericColumns.length > 0 && (
                <p>
                  <span className="font-semibold">Numeric ({numericColumns.length}):</span>{" "}
                  {numericColumns.join(", ")}
                </p>
              )}
              {categoricalColumns.length > 0 && (
                <p>
                  <span className="font-semibold">
                    Categorical ({categoricalColumns.length}):
                  </span>{" "}
                  {categoricalColumns.join(", ")}
                </p>
              )}
            </div>
          )}
          <form action={clearStatsFileAction} className="mt-3">
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline"
            >
              Remove file (clears all analyses)
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
          No file uploaded yet. Drop a CSV above to get started.
        </p>
      )}
    </section>
  );
}

function AddAnalysisForm({
  numericColumns,
  categoricalColumns,
}: {
  numericColumns: string[];
  categoricalColumns: string[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AnalysisKind>("descriptives");
  const [state, action, pending] = useActionState<StatsAnalysisState, FormData>(
    addStatsAnalysisAction,
    null
  );

  if (state?.ok) router.refresh();

  return (
    <form
      action={action}
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">+ Run an analysis</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="block font-medium">Analysis kind</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AnalysisKind)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
          >
            <option value="descriptives">Descriptive statistics</option>
            <option value="compare_means">Compare two groups (t-test)</option>
            <option value="correlation">Correlation matrix</option>
            <option value="histogram">Histogram</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="block font-medium">Title (optional)</span>
          <input
            type="text"
            name="title"
            maxLength={200}
            placeholder="e.g. Baseline characteristics"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
          />
        </label>
      </div>

      <div className="mt-3">
        {kind === "descriptives" && (
          <p className="text-xs text-zinc-500">
            Will compute n / mean / median / SD / min / max / Q1 / Q3 across all{" "}
            <strong>{numericColumns.length}</strong> numeric columns.
          </p>
        )}
        {kind === "compare_means" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium">Outcome (numeric)</span>
              <select
                name="outcomeColumn"
                required
                defaultValue={numericColumns[0] ?? ""}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                {numericColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium">Grouping (categorical)</span>
              <select
                name="groupColumn"
                required
                defaultValue={categoricalColumns[0] ?? ""}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                {categoricalColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {kind === "correlation" && (
          <p className="text-xs text-zinc-500">
            Pearson r between every pair of numeric columns.
          </p>
        )}
        {kind === "histogram" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block font-medium">Column</span>
              <select
                name="histogramColumn"
                required
                defaultValue={numericColumns[0] ?? ""}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                {numericColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium">Bins</span>
              <input
                type="number"
                name="histogramBins"
                defaultValue={12}
                min={3}
                max={50}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
              />
            </label>
          </div>
        )}
      </div>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Computing…" : "Run analysis"}
      </button>
    </form>
  );
}

function AnalysisCard({ analysis }: { analysis: AnalysisForView }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <span className="text-sm font-semibold">{analysis.title}</span>
        <form action={deleteStatsAnalysisAction}>
          <input type="hidden" name="id" value={analysis.id} />
          <button type="submit" className="text-xs text-red-600 hover:underline">
            Remove
          </button>
        </form>
      </header>
      <div className="px-5 py-4">
        <RenderResult analysis={analysis} />
      </div>
    </article>
  );
}

function RenderResult({ analysis }: { analysis: AnalysisForView }) {
  let parsed: unknown = null;
  try {
    parsed = analysis.resultJson ? JSON.parse(analysis.resultJson) : null;
  } catch {
    return <p className="text-sm text-red-600">Couldn&apos;t parse stored result.</p>;
  }
  if (!parsed) return <p className="text-sm text-zinc-500">No result yet.</p>;

  if (analysis.kind === "descriptives") {
    return <DescriptivesTable rows={parsed as DescriptiveRow[]} />;
  }
  if (analysis.kind === "compare_means") {
    const r = parsed as { tTest: TTestResult; groupMeans: GroupMeansRow[] };
    return (
      <div className="space-y-4">
        <TTestTable tt={r.tTest} />
        {analysis.resultSvg && (
          <div
            className="overflow-x-auto rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800/40"
            dangerouslySetInnerHTML={{ __html: analysis.resultSvg }}
          />
        )}
      </div>
    );
  }
  if (analysis.kind === "correlation") {
    const r = parsed as { columns: string[]; cells: CorrelationCell[] };
    return <CorrelationTable matrix={r} />;
  }
  if (analysis.kind === "histogram") {
    const h = parsed as HistogramBins;
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-500">
          n = {h.n} · mean = {fmt(h.mean)} · range [{fmt(h.min)}, {fmt(h.max)}]
        </p>
        {analysis.resultSvg && (
          <div
            className="overflow-x-auto rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800/40"
            dangerouslySetInnerHTML={{ __html: analysis.resultSvg }}
          />
        )}
      </div>
    );
  }
  return <p className="text-sm text-zinc-500">Unknown analysis kind.</p>;
}

function DescriptivesTable({ rows }: { rows: DescriptiveRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="py-2 text-start">Variable</th>
            <th className="py-2 text-end">n</th>
            <th className="py-2 text-end">Mean</th>
            <th className="py-2 text-end">Median</th>
            <th className="py-2 text-end">SD</th>
            <th className="py-2 text-end">Min</th>
            <th className="py-2 text-end">Max</th>
            <th className="py-2 text-end">Q1</th>
            <th className="py-2 text-end">Q3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.column} className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5 font-medium">{r.column}</td>
              <td className="py-1.5 text-end font-mono">{r.n}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.mean)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.median)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.sd)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.min)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.max)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.q1)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(r.q3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TTestTable({ tt }: { tt: TTestResult }) {
  const sig = tt.pValue < 0.05;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 text-start">Group</th>
              <th className="py-2 text-end">n</th>
              <th className="py-2 text-end">Mean</th>
              <th className="py-2 text-end">SD</th>
            </tr>
          </thead>
          <tbody>
            {[tt.group1, tt.group2].map((g) => (
              <tr key={g.name} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <td className="py-1.5 font-medium">{g.name}</td>
                <td className="py-1.5 text-end font-mono">{g.n}</td>
                <td className="py-1.5 text-end font-mono">{fmt(g.mean)}</td>
                <td className="py-1.5 text-end font-mono">{fmt(g.sd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl
        className={`rounded-md p-3 text-sm ${
          sig
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-zinc-50 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
        }`}
      >
        <div className="flex justify-between">
          <dt>Mean difference</dt>
          <dd className="font-mono">{fmt(tt.meanDifference)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>t</dt>
          <dd className="font-mono">{fmt(tt.t, 3)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>df (Welch)</dt>
          <dd className="font-mono">{fmt(tt.df, 1)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>p-value</dt>
          <dd className="font-mono">{fmtP(tt.pValue)}</dd>
        </div>
      </dl>
    </div>
  );
}

function CorrelationTable({
  matrix,
}: {
  matrix: { columns: string[]; cells: CorrelationCell[] };
}) {
  const lookup = (rowCol: string, colCol: string) =>
    matrix.cells.find((c) => c.rowColumn === rowCol && c.colColumn === colCol);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="py-2 text-start"></th>
            {matrix.columns.map((c) => (
              <th key={c} className="py-2 text-end">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.columns.map((rowCol) => (
            <tr key={rowCol} className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5 font-medium">{rowCol}</td>
              {matrix.columns.map((colCol) => {
                const cell = lookup(rowCol, colCol);
                if (!cell) {
                  return (
                    <td key={colCol} className="py-1.5 text-end font-mono text-zinc-400">
                      —
                    </td>
                  );
                }
                const isDiagonal = rowCol === colCol;
                return (
                  <td
                    key={colCol}
                    className="py-1.5 text-end font-mono"
                    title={`r = ${fmt(cell.r, 3)} (n = ${cell.n})`}
                  >
                    {isDiagonal ? "—" : fmt(cell.r, 2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
