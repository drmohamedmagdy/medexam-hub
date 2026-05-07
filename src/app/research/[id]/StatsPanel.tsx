"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addAnalysisAction,
  deleteAnalysisAction,
  type AnalysisKind,
  type AnalysisState,
} from "@/app/actions/research-analysis";
import {
  fmt,
  fmtP,
  type DescriptiveRow,
  type TTestResult,
  type GroupMeansRow,
  type CorrelationCell,
  type HistogramBins,
} from "@/lib/stats-engine";

type FileForPicker = {
  id: string;
  filename: string;
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
};

type AnalysisForView = {
  id: string;
  kind: string;
  title: string;
  configJson: string;
  resultJson: string | null;
  resultSvg: string | null;
  computedAt: string | null;
};

export default function StatsPanel({
  projectId,
  files,
  analyses,
}: {
  projectId: string;
  files: FileForPicker[];
  analyses: AnalysisForView[];
}) {
  return (
    <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">📊 Statistical analysis</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pick a CSV you&apos;ve uploaded, choose the test, and we&apos;ll compute the
            real numbers + render charts. Results embed in the .docx export.
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
          Upload a CSV file in the Data files panel above first. Once it&apos;s
          attached, you can run descriptive stats, group comparisons,
          correlations, or histograms here.
        </p>
      ) : (
        <>
          <AddAnalysisForm projectId={projectId} files={files} />
          {analyses.length > 0 && (
            <ul className="mt-5 space-y-4">
              {analyses.map((a) => (
                <li key={a.id}>
                  <AnalysisCard analysis={a} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function AddAnalysisForm({
  projectId,
  files,
}: {
  projectId: string;
  files: FileForPicker[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AnalysisKind>("descriptives");
  const [fileId, setFileId] = useState<string>(files[0]?.id ?? "");
  const [state, action, pending] = useActionState<AnalysisState, FormData>(
    addAnalysisAction,
    null
  );

  const file = files.find((f) => f.id === fileId);
  if (state?.ok) {
    router.refresh();
  }

  return (
    <form action={action} className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <input type="hidden" name="projectId" value={projectId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="block font-medium">Source file</span>
          <select
            name="fileId"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.filename}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="block font-medium">Analysis</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AnalysisKind)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="descriptives">Descriptive statistics</option>
            <option value="compare_means">Compare two groups (t-test)</option>
            <option value="correlation">Correlation matrix</option>
            <option value="histogram">Histogram</option>
          </select>
        </label>
      </div>

      {file && (
        <div className="mt-3">
          {kind === "descriptives" && (
            <p className="text-xs text-zinc-500">
              Will compute n / mean / median / SD / min / max / Q1 / Q3 for all{" "}
              <strong>{file.numericColumns.length}</strong> numeric columns:{" "}
              {file.numericColumns.join(", ") || "—"}.
            </p>
          )}
          {kind === "compare_means" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="block font-medium">Outcome (numeric)</span>
                <select
                  name="outcomeColumn"
                  required
                  defaultValue={file.numericColumns[0] ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {file.numericColumns.map((c) => (
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
                  defaultValue={file.categoricalColumns[0] ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {file.categoricalColumns.map((c) => (
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
              Will compute Pearson r between every pair of numeric columns:{" "}
              {file.numericColumns.join(", ") || "—"}.
            </p>
          )}
          {kind === "histogram" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="block font-medium">Column</span>
                <select
                  name="histogramColumn"
                  required
                  defaultValue={file.numericColumns[0] ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {file.numericColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="block font-medium">Number of bins</span>
                <input
                  type="number"
                  name="histogramBins"
                  defaultValue={12}
                  min={3}
                  max={50}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {state && !state.ok && state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !fileId}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Computing…" : "+ Run analysis"}
      </button>
    </form>
  );
}

function AnalysisCard({ analysis }: { analysis: AnalysisForView }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <span className="text-sm font-semibold">{analysis.title}</span>
        <form action={deleteAnalysisAction}>
          <input type="hidden" name="id" value={analysis.id} />
          <button type="submit" className="text-xs text-red-600 hover:underline">
            Remove
          </button>
        </form>
      </header>
      <div className="px-4 py-4">
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
                const intensity = Math.abs(cell.r);
                const pos = cell.r > 0;
                const bg = isDiagonal
                  ? "bg-zinc-100 dark:bg-zinc-800/60"
                  : pos
                    ? `bg-blue-${Math.min(900, Math.round(intensity * 700) + 50)}/[${intensity * 0.4 + 0.05}]`
                    : `bg-rose-${Math.min(900, Math.round(intensity * 700) + 50)}/[${intensity * 0.4 + 0.05}]`;
                return (
                  <td
                    key={colCol}
                    className={`py-1.5 text-end font-mono ${bg}`}
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
