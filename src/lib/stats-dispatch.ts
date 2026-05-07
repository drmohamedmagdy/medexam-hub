import "server-only";
import {
  ANALYSIS_KINDS,
  boxplotFor,
  chiSquareTest,
  correlationMatrix,
  descriptivesFor,
  groupMeansFor,
  histogramFor,
  kaplanMeier,
  kruskalWallis,
  linearRegression,
  logisticRegression,
  mannWhitneyU,
  normalityTest,
  oneWayAnova,
  pairedTTest,
  parseCsv,
  rocCurve,
  scatterFor,
  tTestBetween,
  wilcoxonSignedRank,
  type AnalysisKind,
  type ParsedCsv,
} from "@/lib/stats-engine";
import {
  renderBoxplotSvg,
  renderGroupMeansSvg,
  renderHistogramSvg,
  renderKaplanMeierSvg,
  renderLogisticCurveSvg,
  renderRocSvg,
  renderScatterSvg,
} from "@/lib/stats-charts";

const KIND_VALUES = ANALYSIS_KINDS.map((k) => k.value);

export function isAnalysisKind(value: string): value is AnalysisKind {
  return (KIND_VALUES as readonly string[]).includes(value);
}

export type DispatchInput = {
  kind: AnalysisKind;
  title?: string;
  // Generic column args — only the ones relevant for this kind are read.
  outcomeColumn?: string;
  groupColumn?: string;
  predictorColumn?: string;
  pairCol1?: string;
  pairCol2?: string;
  histogramColumn?: string;
  histogramBins?: number;
  columns?: string[];
  // Categorical / binary-specific
  rowVar?: string;
  colVar?: string;
  positiveValue?: string;
  // Survival
  timeColumn?: string;
  eventColumn?: string;
  positiveEventValue?: string;
};

export type DispatchOutput = {
  title: string;
  resultJson: unknown;
  resultSvg: string | null;
  config: Record<string, unknown>;
};

export function dispatchAnalysis(parsed: ParsedCsv, input: DispatchInput): DispatchOutput {
  const config: Record<string, unknown> = {};
  let resultJson: unknown;
  let resultSvg: string | null = null;
  let title = input.title ?? "";

  switch (input.kind) {
    case "descriptives": {
      const cols =
        input.columns && input.columns.length > 0 ? input.columns : parsed.numericColumns;
      if (cols.length === 0) throw new Error("No numeric columns detected.");
      config.columns = cols;
      resultJson = descriptivesFor(parsed, cols);
      title = title || "Descriptive statistics";
      break;
    }
    case "compare_means": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.groupColumn, "groupColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.groupColumn = input.groupColumn;
      const tt = tTestBetween(parsed, input.outcomeColumn!, input.groupColumn!);
      const groupMeans = groupMeansFor(parsed, input.outcomeColumn!, input.groupColumn!);
      resultJson = { tTest: tt, groupMeans };
      resultSvg = renderGroupMeansSvg(groupMeans, {
        outcome: input.outcomeColumn!,
        group: input.groupColumn!,
      });
      title = title || `${input.outcomeColumn} by ${input.groupColumn} (t-test)`;
      break;
    }
    case "paired_t": {
      requireField(input.pairCol1, "pairCol1");
      requireField(input.pairCol2, "pairCol2");
      config.pairCol1 = input.pairCol1;
      config.pairCol2 = input.pairCol2;
      resultJson = pairedTTest(parsed, input.pairCol1!, input.pairCol2!);
      title = title || `${input.pairCol1} vs ${input.pairCol2} (paired t)`;
      break;
    }
    case "mann_whitney": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.groupColumn, "groupColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.groupColumn = input.groupColumn;
      const mw = mannWhitneyU(parsed, input.outcomeColumn!, input.groupColumn!);
      const groupMeans = groupMeansFor(parsed, input.outcomeColumn!, input.groupColumn!);
      resultJson = { mannWhitney: mw, groupMeans };
      resultSvg = renderGroupMeansSvg(groupMeans, {
        outcome: input.outcomeColumn!,
        group: input.groupColumn!,
      });
      title = title || `${input.outcomeColumn} by ${input.groupColumn} (Mann–Whitney)`;
      break;
    }
    case "wilcoxon": {
      requireField(input.pairCol1, "pairCol1");
      requireField(input.pairCol2, "pairCol2");
      config.pairCol1 = input.pairCol1;
      config.pairCol2 = input.pairCol2;
      resultJson = wilcoxonSignedRank(parsed, input.pairCol1!, input.pairCol2!);
      title = title || `${input.pairCol1} vs ${input.pairCol2} (Wilcoxon)`;
      break;
    }
    case "anova": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.groupColumn, "groupColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.groupColumn = input.groupColumn;
      const a = oneWayAnova(parsed, input.outcomeColumn!, input.groupColumn!);
      const groupMeans = groupMeansFor(parsed, input.outcomeColumn!, input.groupColumn!);
      resultJson = { anova: a, groupMeans };
      resultSvg = renderGroupMeansSvg(groupMeans, {
        outcome: input.outcomeColumn!,
        group: input.groupColumn!,
      });
      title = title || `${input.outcomeColumn} by ${input.groupColumn} (ANOVA)`;
      break;
    }
    case "kruskal_wallis": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.groupColumn, "groupColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.groupColumn = input.groupColumn;
      const kw = kruskalWallis(parsed, input.outcomeColumn!, input.groupColumn!);
      const groupMeans = groupMeansFor(parsed, input.outcomeColumn!, input.groupColumn!);
      resultJson = { kruskalWallis: kw, groupMeans };
      resultSvg = renderGroupMeansSvg(groupMeans, {
        outcome: input.outcomeColumn!,
        group: input.groupColumn!,
      });
      title = title || `${input.outcomeColumn} by ${input.groupColumn} (Kruskal–Wallis)`;
      break;
    }
    case "chi_square": {
      requireField(input.rowVar, "rowVar");
      requireField(input.colVar, "colVar");
      config.rowVar = input.rowVar;
      config.colVar = input.colVar;
      resultJson = chiSquareTest(parsed, input.rowVar!, input.colVar!);
      title = title || `${input.rowVar} × ${input.colVar} (chi-square)`;
      break;
    }
    case "correlation": {
      const cols =
        input.columns && input.columns.length > 0 ? input.columns : parsed.numericColumns;
      if (cols.length < 2) throw new Error("Pick at least 2 numeric columns.");
      config.columns = cols;
      resultJson = correlationMatrix(parsed, cols);
      title = title || `Correlation matrix — ${cols.length} variables`;
      break;
    }
    case "linear_regression": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.predictorColumn, "predictorColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.predictorColumn = input.predictorColumn;
      const lr = linearRegression(
        parsed,
        input.outcomeColumn!,
        input.predictorColumn!
      );
      resultJson = lr;
      resultSvg = renderScatterSvg(
        {
          xColumn: input.predictorColumn!,
          yColumn: input.outcomeColumn!,
          points: lr.points,
          intercept: lr.intercept,
          slope: lr.slope,
          r: lr.r,
        },
        { showLine: true }
      );
      title =
        title ||
        `${input.outcomeColumn} ~ ${input.predictorColumn} (linear regression)`;
      break;
    }
    case "logistic_regression": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.predictorColumn, "predictorColumn");
      requireField(input.positiveValue, "positiveValue");
      config.outcomeColumn = input.outcomeColumn;
      config.predictorColumn = input.predictorColumn;
      config.positiveValue = input.positiveValue;
      const lr = logisticRegression(
        parsed,
        input.outcomeColumn!,
        input.predictorColumn!,
        input.positiveValue!
      );
      resultJson = lr;
      resultSvg = renderLogisticCurveSvg(lr);
      title =
        title ||
        `${input.outcomeColumn} ~ ${input.predictorColumn} (logistic regression)`;
      break;
    }
    case "kaplan_meier": {
      requireField(input.timeColumn, "timeColumn");
      requireField(input.eventColumn, "eventColumn");
      requireField(input.positiveEventValue, "positiveEventValue");
      config.timeColumn = input.timeColumn;
      config.eventColumn = input.eventColumn;
      config.positiveEventValue = input.positiveEventValue;
      if (input.groupColumn) config.groupColumn = input.groupColumn;
      const km = kaplanMeier(
        parsed,
        input.timeColumn!,
        input.eventColumn!,
        input.positiveEventValue!,
        input.groupColumn
      );
      resultJson = km;
      resultSvg = renderKaplanMeierSvg(km);
      title =
        title ||
        `Kaplan–Meier${input.groupColumn ? ` by ${input.groupColumn}` : ""}`;
      break;
    }
    case "roc": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.predictorColumn, "predictorColumn");
      requireField(input.positiveValue, "positiveValue");
      config.outcomeColumn = input.outcomeColumn;
      config.predictorColumn = input.predictorColumn;
      config.positiveValue = input.positiveValue;
      const roc = rocCurve(
        parsed,
        input.outcomeColumn!,
        input.predictorColumn!,
        input.positiveValue!
      );
      resultJson = roc;
      resultSvg = renderRocSvg(roc);
      title =
        title ||
        `ROC: ${input.outcomeColumn} vs ${input.predictorColumn} (AUC ${roc.auc.toFixed(3)})`;
      break;
    }
    case "normality": {
      requireField(input.histogramColumn, "histogramColumn");
      config.column = input.histogramColumn;
      resultJson = normalityTest(parsed, input.histogramColumn!);
      title = title || `Normality of ${input.histogramColumn}`;
      break;
    }
    case "histogram": {
      requireField(input.histogramColumn, "histogramColumn");
      const numBins = input.histogramBins ?? 12;
      config.column = input.histogramColumn;
      config.bins = numBins;
      const hist = histogramFor(parsed, input.histogramColumn!, numBins);
      resultJson = hist;
      resultSvg = renderHistogramSvg(hist);
      title = title || `Distribution of ${input.histogramColumn}`;
      break;
    }
    case "boxplot": {
      requireField(input.outcomeColumn, "outcomeColumn");
      requireField(input.groupColumn, "groupColumn");
      config.outcomeColumn = input.outcomeColumn;
      config.groupColumn = input.groupColumn;
      const bp = boxplotFor(parsed, input.outcomeColumn!, input.groupColumn!);
      resultJson = bp;
      resultSvg = renderBoxplotSvg(bp);
      title = title || `${input.outcomeColumn} by ${input.groupColumn} (box plot)`;
      break;
    }
    case "scatter": {
      requireField(input.pairCol1, "pairCol1");
      requireField(input.pairCol2, "pairCol2");
      config.xColumn = input.pairCol1;
      config.yColumn = input.pairCol2;
      const sc = scatterFor(parsed, input.pairCol1!, input.pairCol2!);
      resultJson = sc;
      resultSvg = renderScatterSvg(sc, { showLine: true });
      title = title || `${input.pairCol2} vs ${input.pairCol1}`;
      break;
    }
  }

  return { title, resultJson, resultSvg, config };
}

function requireField(v: string | undefined, name: string): asserts v is string {
  if (!v) throw new Error(`Missing required field: ${name}`);
}

export function parseDispatchInput(formData: FormData): DispatchInput {
  const kindRaw = String(formData.get("kind") ?? "");
  if (!isAnalysisKind(kindRaw)) {
    throw new Error("Unsupported analysis kind.");
  }
  const get = (k: string): string | undefined => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length > 0 ? v : undefined;
  };
  const columnsRaw = get("columns");
  const binsRaw = formData.get("histogramBins");
  return {
    kind: kindRaw,
    title: get("title"),
    outcomeColumn: get("outcomeColumn"),
    groupColumn: get("groupColumn"),
    predictorColumn: get("predictorColumn"),
    pairCol1: get("pairCol1"),
    pairCol2: get("pairCol2"),
    histogramColumn: get("histogramColumn"),
    histogramBins: binsRaw != null && String(binsRaw).trim() ? Number(binsRaw) : undefined,
    columns: columnsRaw ? columnsRaw.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
    rowVar: get("rowVar"),
    colVar: get("colVar"),
    positiveValue: get("positiveValue"),
    timeColumn: get("timeColumn"),
    eventColumn: get("eventColumn"),
    positiveEventValue: get("positiveEventValue"),
  };
}

export { parseCsv };
