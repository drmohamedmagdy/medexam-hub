"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import {
  addStatsFileAction,
  removeStatsFileAction,
  clearStatsWorkspaceAction,
  addStatsAnalysisAction,
  deleteStatsAnalysisAction,
  type StatsState,
  type StatsAnalysisState,
} from "@/app/actions/statistics";
import AnalysisFormFields, { type ColumnSummary } from "@/components/AnalysisFormFields";
import AnalysisResult, { type AnalysisForView } from "@/components/AnalysisResult";
import type { AnalysisKind } from "@/lib/stats-engine";

type FileForPicker = {
  id: string;
  filename: string;
  sizeBytes: number;
  charCount: number;
  uploadedAt: string;
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  binaryColumns: string[];
  binaryValues: Record<string, string[]>;
};

type AnalysisRow = AnalysisForView & { fileId: string | null };

export default function StatsClient({
  files,
  analyses,
}: {
  files: FileForPicker[];
  analyses: AnalysisRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const hasFiles = files.length > 0;

  return (
    <div className="mt-6 space-y-5">
      <FilePanel files={files} />

      {hasFiles && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">📊 Statistical analyses</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Run as many tests as you need across your uploaded files. Past
                results are kept here until you remove them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showForm ? "Close" : "+ Run new stat analysis"}
            </button>
          </div>

          {showForm && (
            <div className="mt-4">
              <AddAnalysisForm
                files={files}
                onComplete={() => setShowForm(false)}
              />
            </div>
          )}

          {analyses.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {analyses.map((a) => (
                <li key={a.id}>
                  <AnalysisCard analysis={a} files={files} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
              No analyses yet. Click <strong>+ Run new stat analysis</strong> above
              to create one.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function FilePanel({ files }: { files: FileForPicker[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(picked: FileList) {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(picked)) {
        setProgress({ name: file.name, pct: 0 });
        const blob = await upload(`statistics/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/statistics/upload",
          onUploadProgress: ({ percentage }) =>
            setProgress({ name: file.name, pct: Math.round(percentage) }),
        });
        const fd = new FormData();
        fd.set("fileUrl", blob.url);
        fd.set("filePathname", blob.pathname);
        fd.set("filename", file.name);
        fd.set("mimeType", file.type || "application/octet-stream");
        fd.set("sizeBytes", String(file.size));
        const result = await addStatsFileAction(null, fd);
        if (!result?.ok) throw new Error(result?.error ?? `Upload failed for ${file.name}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadFiles(e.target.files);
    e.target.value = "";
  }

  const isUpgradeError = error?.startsWith("[UPGRADE_REQUIRED] ");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">📎 Data files</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Upload one or more CSV / Excel files. We&apos;ll auto-detect numeric,
            categorical, and binary columns in each.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
          {files.length === 0 ? "+ Upload data files" : "+ Add more files"}
          <input
            type="file"
            multiple
            accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.docx,.doc"
            onChange={onPick}
            disabled={busy}
            className="sr-only"
          />
        </label>
      </div>

      {busy && progress && (
        <p className="mt-3 text-xs text-zinc-500">
          Uploading {progress.name} — {progress.pct}%
        </p>
      )}
      {error && isUpgradeError ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          <span>{error.slice("[UPGRADE_REQUIRED] ".length)}</span>
          <a
            href="/plans"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            Upgrade to Researcher →
          </a>
        </div>
      ) : error ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {files.length === 0 ? (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
          No files uploaded yet. Drop one or more above to get started.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p>
                      <strong>{f.filename}</strong> ·{" "}
                      {f.sizeBytes
                        ? `${(f.sizeBytes / 1024).toFixed(0)} KB · `
                        : ""}
                      {f.charCount.toLocaleString()} chars · uploaded{" "}
                      {new Date(f.uploadedAt).toLocaleString()}
                    </p>
                    {(f.numericColumns.length > 0 ||
                      f.categoricalColumns.length > 0) && (
                      <div className="mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                        {f.numericColumns.length > 0 && (
                          <p>
                            <span className="font-semibold">
                              Numeric ({f.numericColumns.length}):
                            </span>{" "}
                            {f.numericColumns.join(", ")}
                          </p>
                        )}
                        {f.categoricalColumns.length > 0 && (
                          <p>
                            <span className="font-semibold">
                              Categorical ({f.categoricalColumns.length}):
                            </span>{" "}
                            {f.categoricalColumns.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <form action={removeStatsFileAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <form action={clearStatsWorkspaceAction} className="mt-3">
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline"
            >
              Remove all files + analyses
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function AddAnalysisForm({
  files,
  onComplete,
}: {
  files: FileForPicker[];
  onComplete: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AnalysisKind>("descriptives");
  const [fileId, setFileId] = useState<string>(files[0]?.id ?? "");
  const [state, action, pending] = useActionState<StatsAnalysisState, FormData>(
    addStatsAnalysisAction,
    null
  );

  if (state?.ok) {
    router.refresh();
    onComplete();
  }

  const file = files.find((f) => f.id === fileId);
  const cols: ColumnSummary = file
    ? {
        numericColumns: file.numericColumns,
        categoricalColumns: file.categoricalColumns,
        binaryColumns: file.binaryColumns,
        binaryValues: file.binaryValues,
      }
    : {
        numericColumns: [],
        categoricalColumns: [],
        binaryColumns: [],
        binaryValues: {},
      };

  return (
    <form
      action={action}
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
    >
      <input type="hidden" name="fileId" value={fileId} />

      <label className="block text-sm">
        <span className="block font-medium">Source file</span>
        <select
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

      <div className="mt-3">
        <AnalysisFormFields kind={kind} setKind={setKind} cols={cols} />
      </div>

      {state?.error && <ErrorOrUpgrade error={state.error} />}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !fileId}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Computing…" : "Run analysis"}
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ErrorOrUpgrade({ error }: { error: string }) {
  const UPGRADE = "[UPGRADE_REQUIRED] ";
  if (error.startsWith(UPGRADE)) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
        <span>{error.slice(UPGRADE.length)}</span>
        <a
          href="/plans"
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
        >
          Upgrade to Researcher →
        </a>
      </div>
    );
  }
  return (
    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
      {error}
    </p>
  );
}

function AnalysisCard({
  analysis,
  files,
}: {
  analysis: AnalysisRow;
  files: FileForPicker[];
}) {
  const sourceFile = files.find((f) => f.id === analysis.fileId);
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div>
          <span className="text-sm font-semibold">{analysis.title}</span>
          {sourceFile && (
            <span className="ml-2 text-xs text-zinc-500">
              from {sourceFile.filename}
            </span>
          )}
        </div>
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
