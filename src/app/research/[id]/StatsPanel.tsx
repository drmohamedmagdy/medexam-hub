"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addAnalysisAction,
  deleteAnalysisAction,
  type AnalysisState,
} from "@/app/actions/research-analysis";
import AnalysisFormFields, { type ColumnSummary } from "@/components/AnalysisFormFields";
import AnalysisResult, { type AnalysisForView } from "@/components/AnalysisResult";
import type { AnalysisKind } from "@/lib/stats-engine";

type FileForPicker = {
  id: string;
  filename: string;
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  binaryColumns: string[];
  binaryValues: Record<string, string[]>;
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
          attached, you can run any of the supported analyses here.
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
  if (state?.ok) router.refresh();

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
      className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
    >
      <input type="hidden" name="projectId" value={projectId} />
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

      {state && !state.ok && state.error && <ErrorOrUpgrade error={state.error} />}

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
        <AnalysisResult analysis={analysis} />
      </div>
    </article>
  );
}
