"use client";

import { useState } from "react";
import { ANALYSIS_KINDS, type AnalysisKind } from "@/lib/stats-engine";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40";

export type ColumnSummary = {
  numericColumns: string[];
  categoricalColumns: string[];
  binaryColumns: string[];
  binaryValues: Record<string, string[]>; // colName -> two distinct values
};

/**
 * Renders the kind-aware configuration inputs for an analysis. The parent
 * is responsible for the surrounding form (`<form action={...}>`), the
 * "Run analysis" button, and the title field.
 */
export default function AnalysisFormFields({
  kind,
  setKind,
  cols,
  withTitle = true,
}: {
  kind: AnalysisKind;
  setKind: (k: AnalysisKind) => void;
  cols: ColumnSummary;
  withTitle?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="block font-medium">Analysis</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AnalysisKind)}
            className={inputClass}
          >
            {ANALYSIS_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {withTitle && (
          <label className="block text-sm">
            <span className="block font-medium">Title (optional)</span>
            <input
              type="text"
              name="title"
              maxLength={200}
              placeholder="e.g. Baseline characteristics"
              className={inputClass}
            />
          </label>
        )}
      </div>

      <div className="mt-3">
        <KindFields kind={kind} cols={cols} />
      </div>
    </>
  );
}

function KindFields({ kind, cols }: { kind: AnalysisKind; cols: ColumnSummary }) {
  switch (kind) {
    case "descriptives":
      return (
        <p className="text-xs text-zinc-500">
          Computes n / mean / median / SD / min / max / Q1 / Q3 across all{" "}
          <strong>{cols.numericColumns.length}</strong> numeric columns.
        </p>
      );
    case "compare_means":
    case "mann_whitney":
    case "anova":
    case "kruskal_wallis":
    case "boxplot":
      return <NumericByCategorical cols={cols} />;
    case "paired_t":
    case "wilcoxon":
    case "scatter":
      return <TwoNumeric cols={cols} />;
    case "linear_regression":
      return <OutcomePredictor cols={cols} />;
    case "logistic_regression":
      return <BinaryOutcomeContinuousPredictor cols={cols} />;
    case "kaplan_meier":
      return <SurvivalFields cols={cols} />;
    case "roc":
      return <BinaryOutcomeContinuousPredictor cols={cols} positiveLabel="Positive class (case)" />;
    case "chi_square":
      return <TwoCategorical cols={cols} />;
    case "correlation":
      return (
        <p className="text-xs text-zinc-500">
          Pearson r between every pair of numeric columns.
        </p>
      );
    case "normality":
    case "histogram":
      return <SingleNumeric cols={cols} kind={kind} />;
  }
}

function SingleNumeric({ cols, kind }: { cols: ColumnSummary; kind: "histogram" | "normality" }) {
  if (cols.numericColumns.length === 0) {
    return <NoColumnsHint label="numeric" />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Numeric column</span>
        <select
          name="histogramColumn"
          required
          defaultValue={cols.numericColumns[0] ?? ""}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {kind === "histogram" && (
        <label className="block text-sm">
          <span className="block font-medium">Bins</span>
          <input
            type="number"
            name="histogramBins"
            defaultValue={12}
            min={3}
            max={50}
            className={inputClass}
          />
        </label>
      )}
    </div>
  );
}

function NumericByCategorical({ cols }: { cols: ColumnSummary }) {
  if (cols.numericColumns.length === 0) return <NoColumnsHint label="numeric" />;
  if (cols.categoricalColumns.length === 0) return <NoColumnsHint label="categorical" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Outcome (numeric)</span>
        <select
          name="outcomeColumn"
          required
          defaultValue={cols.numericColumns[0] ?? ""}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Group (categorical)</span>
        <select
          name="groupColumn"
          required
          defaultValue={cols.categoricalColumns[0] ?? ""}
          className={inputClass}
        >
          {cols.categoricalColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TwoNumeric({ cols }: { cols: ColumnSummary }) {
  if (cols.numericColumns.length < 2) {
    return <NoColumnsHint label="numeric" minLabel="at least 2 numeric" />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Column 1 / x</span>
        <select
          name="pairCol1"
          required
          defaultValue={cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Column 2 / y</span>
        <select
          name="pairCol2"
          required
          defaultValue={cols.numericColumns[1] ?? cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TwoCategorical({ cols }: { cols: ColumnSummary }) {
  if (cols.categoricalColumns.length < 2) {
    return <NoColumnsHint label="categorical" minLabel="at least 2 categorical" />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Row variable</span>
        <select
          name="rowVar"
          required
          defaultValue={cols.categoricalColumns[0]}
          className={inputClass}
        >
          {cols.categoricalColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Column variable</span>
        <select
          name="colVar"
          required
          defaultValue={cols.categoricalColumns[1] ?? cols.categoricalColumns[0]}
          className={inputClass}
        >
          {cols.categoricalColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OutcomePredictor({ cols }: { cols: ColumnSummary }) {
  if (cols.numericColumns.length < 2) {
    return <NoColumnsHint label="numeric" minLabel="at least 2 numeric" />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Outcome (y, numeric)</span>
        <select
          name="outcomeColumn"
          required
          defaultValue={cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Predictor (x, numeric)</span>
        <select
          name="predictorColumn"
          required
          defaultValue={cols.numericColumns[1] ?? cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function BinaryOutcomeContinuousPredictor({
  cols,
  positiveLabel = "Positive class",
}: {
  cols: ColumnSummary;
  positiveLabel?: string;
}) {
  const [outcome, setOutcome] = useState<string>(cols.binaryColumns[0] ?? "");
  if (cols.binaryColumns.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        No binary (2-value) column detected. Add a column like 0/1 or yes/no.
      </p>
    );
  }
  if (cols.numericColumns.length === 0) return <NoColumnsHint label="numeric" />;

  const outcomeOptions = cols.binaryColumns;
  const positiveOptions = cols.binaryValues[outcome] ?? [];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block text-sm">
        <span className="block font-medium">Outcome (binary)</span>
        <select
          name="outcomeColumn"
          required
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className={inputClass}
        >
          {outcomeOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">{positiveLabel}</span>
        <select
          name="positiveValue"
          required
          defaultValue={positiveOptions[positiveOptions.length - 1] ?? ""}
          className={inputClass}
        >
          {positiveOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Predictor (numeric)</span>
        <select
          name="predictorColumn"
          required
          defaultValue={cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SurvivalFields({ cols }: { cols: ColumnSummary }) {
  const [eventCol, setEventCol] = useState<string>(cols.binaryColumns[0] ?? "");
  if (cols.numericColumns.length === 0) return <NoColumnsHint label="numeric (time)" />;
  if (cols.binaryColumns.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        No binary (2-value) column detected for the event indicator (e.g. 0=censored, 1=died).
      </p>
    );
  }
  const positiveOptions = cols.binaryValues[eventCol] ?? [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="block font-medium">Time column (numeric)</span>
        <select
          name="timeColumn"
          required
          defaultValue={cols.numericColumns[0]}
          className={inputClass}
        >
          {cols.numericColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Event column (binary)</span>
        <select
          name="eventColumn"
          required
          value={eventCol}
          onChange={(e) => setEventCol(e.target.value)}
          className={inputClass}
        >
          {cols.binaryColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Event = "occurred" value</span>
        <select
          name="positiveEventValue"
          required
          defaultValue={positiveOptions[positiveOptions.length - 1] ?? ""}
          className={inputClass}
        >
          {positiveOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="block font-medium">Group (optional, categorical)</span>
        <select
          name="groupColumn"
          defaultValue=""
          className={inputClass}
        >
          <option value="">— No group (single curve) —</option>
          {cols.categoricalColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function NoColumnsHint({
  label,
  minLabel,
}: {
  label: string;
  minLabel?: string;
}) {
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      Need {minLabel ?? `a ${label}`} column. We didn&apos;t detect one in your file.
    </p>
  );
}
