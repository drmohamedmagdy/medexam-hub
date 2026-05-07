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
import AnalysisFormFields, { type ColumnSummary } from "@/components/AnalysisFormFields";
import AnalysisResult, { type AnalysisForView } from "@/components/AnalysisResult";
import type { AnalysisKind } from "@/lib/stats-engine";

export default function StatsClient({
  hasFile,
  filename,
  sizeBytes,
  charCount,
  uploadedAt,
  columns,
  numericColumns,
  categoricalColumns,
  binaryColumns,
  binaryValues,
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
  binaryColumns: string[];
  binaryValues: Record<string, string[]>;
  analyses: AnalysisForView[];
}) {
  const cols: ColumnSummary = {
    numericColumns,
    categoricalColumns,
    binaryColumns,
    binaryValues,
  };
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
          <AddAnalysisForm cols={cols} />
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
  const [, , replacePending] = useActionState<StatsState, FormData>(
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
            Upload a CSV or Excel file. We&apos;ll auto-detect numeric, categorical,
            and binary columns.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
          {hasFile ? "Replace file" : "+ Upload data"}
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.docx,.doc"
            onChange={onPick}
            disabled={busy || replacePending}
            className="sr-only"
          />
        </label>
      </div>

      {busy && <p className="mt-3 text-xs text-zinc-500">Uploading {progress}%</p>}
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
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Remove file (clears all analyses)
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
          No file uploaded yet. Drop a CSV or Excel file above to get started.
        </p>
      )}
    </section>
  );
}

function AddAnalysisForm({ cols }: { cols: ColumnSummary }) {
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
      <div className="mt-3">
        <AnalysisFormFields kind={kind} setKind={setKind} cols={cols} />
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
        <AnalysisResult analysis={analysis} />
      </div>
    </article>
  );
}
