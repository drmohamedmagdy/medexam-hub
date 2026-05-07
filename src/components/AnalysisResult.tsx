"use client";

import {
  fmt,
  fmtP,
  type AnovaResult,
  type BoxplotResult,
  type ChiSquareResult,
  type CorrelationCell,
  type DescriptiveRow,
  type GroupMeansRow,
  type HistogramBins,
  type KaplanMeierResult,
  type KruskalWallisResult,
  type LinearRegressionResult,
  type LogisticRegressionResult,
  type MannWhitneyResult,
  type NormalityResult,
  type PairedTResult,
  type RocResult,
  type ScatterResult,
  type TTestResult,
  type WilcoxonResult,
} from "@/lib/stats-engine";

export type AnalysisForView = {
  id: string;
  kind: string;
  title: string;
  resultJson: string | null;
  resultSvg: string | null;
};

export default function AnalysisResult({ analysis }: { analysis: AnalysisForView }) {
  let parsed: unknown = null;
  try {
    parsed = analysis.resultJson ? JSON.parse(analysis.resultJson) : null;
  } catch {
    return <p className="text-sm text-red-600">Couldn&apos;t parse stored result.</p>;
  }
  if (!parsed) return <p className="text-sm text-zinc-500">No result yet.</p>;

  const svg = analysis.resultSvg ? <ChartFromSvg svg={analysis.resultSvg} /> : null;

  switch (analysis.kind) {
    case "descriptives":
      return <DescriptivesTable rows={parsed as DescriptiveRow[]} />;
    case "compare_means": {
      const r = parsed as { tTest: TTestResult; groupMeans: GroupMeansRow[] };
      return (
        <Stack>
          <TTestTable tt={r.tTest} />
          {svg}
        </Stack>
      );
    }
    case "paired_t":
      return <PairedTBlock t={parsed as PairedTResult} />;
    case "mann_whitney": {
      const r = parsed as { mannWhitney: MannWhitneyResult; groupMeans: GroupMeansRow[] };
      return (
        <Stack>
          <MannWhitneyBlock mw={r.mannWhitney} />
          {svg}
        </Stack>
      );
    }
    case "wilcoxon":
      return <WilcoxonBlock w={parsed as WilcoxonResult} />;
    case "anova": {
      const r = parsed as { anova: AnovaResult; groupMeans: GroupMeansRow[] };
      return (
        <Stack>
          <AnovaBlock a={r.anova} />
          {svg}
        </Stack>
      );
    }
    case "kruskal_wallis": {
      const r = parsed as { kruskalWallis: KruskalWallisResult; groupMeans: GroupMeansRow[] };
      return (
        <Stack>
          <KruskalBlock k={r.kruskalWallis} />
          {svg}
        </Stack>
      );
    }
    case "chi_square":
      return <ChiSquareBlock c={parsed as ChiSquareResult} />;
    case "correlation":
      return <CorrelationTable matrix={parsed as { columns: string[]; cells: CorrelationCell[] }} />;
    case "linear_regression":
      return (
        <Stack>
          <LinearRegBlock lr={parsed as LinearRegressionResult} />
          {svg}
        </Stack>
      );
    case "logistic_regression":
      return (
        <Stack>
          <LogisticBlock lr={parsed as LogisticRegressionResult} />
          {svg}
        </Stack>
      );
    case "kaplan_meier":
      return (
        <Stack>
          <KaplanMeierBlock km={parsed as KaplanMeierResult} />
          {svg}
        </Stack>
      );
    case "roc":
      return (
        <Stack>
          <RocBlock r={parsed as RocResult} />
          {svg}
        </Stack>
      );
    case "normality":
      return <NormalityBlock n={parsed as NormalityResult} />;
    case "histogram": {
      const h = parsed as HistogramBins;
      return (
        <Stack>
          <p className="text-xs text-zinc-500">
            n = {h.n} · mean = {fmt(h.mean)} · range [{fmt(h.min)}, {fmt(h.max)}]
          </p>
          {svg}
        </Stack>
      );
    }
    case "boxplot":
      return (
        <Stack>
          <BoxplotSummary b={parsed as BoxplotResult} />
          {svg}
        </Stack>
      );
    case "scatter":
      return (
        <Stack>
          <ScatterSummary s={parsed as ScatterResult} />
          {svg}
        </Stack>
      );
    default:
      return <p className="text-sm text-zinc-500">Unknown analysis kind.</p>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function ChartFromSvg({ svg }: { svg: string }) {
  return (
    <div
      className="overflow-x-auto rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800/40"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function StatRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function PValuePanel({ p, extra }: { p: number; extra?: { label: string; value: string }[] }) {
  const sig = p < 0.05;
  return (
    <dl
      className={`rounded-md p-3 text-sm ${
        sig
          ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "bg-zinc-50 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
      }`}
    >
      {extra?.map((e) => <StatRow key={e.label} label={e.label} value={e.value} />)}
      <StatRow label="p-value" value={fmtP(p)} bold />
    </dl>
  );
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

function GroupTable({
  rows,
  cols,
}: {
  rows: { name: string; n: number; mean?: number; sd?: number; meanRank?: number }[];
  cols: ("Mean" | "SD" | "Mean rank")[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="py-2 text-start">Group</th>
            <th className="py-2 text-end">n</th>
            {cols.map((c) => (
              <th key={c} className="py-2 text-end">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5 font-medium">{r.name}</td>
              <td className="py-1.5 text-end font-mono">{r.n}</td>
              {cols.map((c) => (
                <td key={c} className="py-1.5 text-end font-mono">
                  {c === "Mean" && fmt(r.mean ?? NaN)}
                  {c === "SD" && fmt(r.sd ?? NaN)}
                  {c === "Mean rank" && fmt(r.meanRank ?? NaN)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TTestTable({ tt }: { tt: TTestResult }) {
  return (
    <Stack>
      <GroupTable
        rows={[tt.group1, tt.group2].map((g) => ({ name: g.name, n: g.n, mean: g.mean, sd: g.sd }))}
        cols={["Mean", "SD"]}
      />
      <PValuePanel
        p={tt.pValue}
        extra={[
          { label: "Mean difference", value: fmt(tt.meanDifference) },
          { label: "t", value: fmt(tt.t, 3) },
          { label: "df (Welch)", value: fmt(tt.df, 1) },
        ]}
      />
    </Stack>
  );
}

function PairedTBlock({ t }: { t: PairedTResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Paired comparison: <strong>{t.col1}</strong> vs. <strong>{t.col2}</strong> (n = {t.n}).
      </p>
      <PValuePanel
        p={t.pValue}
        extra={[
          { label: "Mean difference", value: fmt(t.meanDiff) },
          { label: "SD of differences", value: fmt(t.sdDiff) },
          { label: "t", value: fmt(t.t, 3) },
          { label: "df", value: String(t.df) },
        ]}
      />
    </Stack>
  );
}

function MannWhitneyBlock({ mw }: { mw: MannWhitneyResult }) {
  return (
    <Stack>
      <GroupTable
        rows={[mw.group1, mw.group2].map((g) => ({
          name: g.name,
          n: g.n,
          meanRank: g.meanRank,
        }))}
        cols={["Mean rank"]}
      />
      <PValuePanel
        p={mw.pValue}
        extra={[
          { label: "U", value: fmt(mw.u, 1) },
          { label: "Z", value: fmt(mw.z, 3) },
        ]}
      />
    </Stack>
  );
}

function WilcoxonBlock({ w }: { w: WilcoxonResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Paired non-parametric: <strong>{w.col1}</strong> vs. <strong>{w.col2}</strong> (n = {w.n}{" "}
        non-zero differences).
      </p>
      <PValuePanel
        p={w.pValue}
        extra={[
          { label: "W+ (sum of positive ranks)", value: fmt(w.wPositive, 1) },
          { label: "W− (sum of negative ranks)", value: fmt(w.wNegative, 1) },
          { label: "Z", value: fmt(w.z, 3) },
        ]}
      />
    </Stack>
  );
}

function AnovaBlock({ a }: { a: AnovaResult }) {
  return (
    <Stack>
      <GroupTable
        rows={a.groups.map((g) => ({ name: g.name, n: g.n, mean: g.mean, sd: g.sd }))}
        cols={["Mean", "SD"]}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 text-start">Source</th>
              <th className="py-2 text-end">SS</th>
              <th className="py-2 text-end">df</th>
              <th className="py-2 text-end">MS</th>
              <th className="py-2 text-end">F</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5">Between</td>
              <td className="py-1.5 text-end font-mono">{fmt(a.ssBetween)}</td>
              <td className="py-1.5 text-end font-mono">{a.dfBetween}</td>
              <td className="py-1.5 text-end font-mono">{fmt(a.msBetween)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(a.f, 3)}</td>
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5">Within</td>
              <td className="py-1.5 text-end font-mono">{fmt(a.ssWithin)}</td>
              <td className="py-1.5 text-end font-mono">{a.dfWithin}</td>
              <td className="py-1.5 text-end font-mono">{fmt(a.msWithin)}</td>
              <td className="py-1.5 text-end font-mono">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PValuePanel p={a.pValue} extra={[{ label: "F", value: fmt(a.f, 3) }]} />
    </Stack>
  );
}

function KruskalBlock({ k }: { k: KruskalWallisResult }) {
  return (
    <Stack>
      <GroupTable
        rows={k.groups.map((g) => ({ name: g.name, n: g.n, meanRank: g.meanRank }))}
        cols={["Mean rank"]}
      />
      <PValuePanel
        p={k.pValue}
        extra={[
          { label: "H", value: fmt(k.h, 3) },
          { label: "df", value: String(k.df) },
        ]}
      />
    </Stack>
  );
}

function ChiSquareBlock({ c }: { c: ChiSquareResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Cross-tabulation of <strong>{c.rowVar}</strong> × <strong>{c.colVar}</strong>:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 text-start"></th>
              {c.colLevels.map((l) => (
                <th key={l} className="py-2 text-end">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.rowLevels.map((rl, i) => (
              <tr key={rl} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <td className="py-1.5 font-medium">{rl}</td>
                {c.colLevels.map((_, j) => (
                  <td key={j} className="py-1.5 text-end font-mono">
                    {c.observed[i][j]}{" "}
                    <span className="text-xs text-zinc-400">({fmt(c.expected[i][j], 1)})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Cells show observed (expected).</p>
      <PValuePanel
        p={c.pValue}
        extra={[
          { label: "χ²", value: fmt(c.chi2, 3) },
          { label: "df", value: String(c.df) },
          ...(typeof c.fisherP === "number"
            ? [{ label: "Fisher's exact (two-sided)", value: fmtP(c.fisherP) }]
            : []),
        ]}
      />
      {c.warning && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {c.warning}
        </p>
      )}
    </Stack>
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

function LinearRegBlock({ lr }: { lr: LinearRegressionResult }) {
  return (
    <Stack>
      <p className="text-sm">
        <strong>{lr.outcome}</strong> = {fmt(lr.intercept, 3)} + {fmt(lr.slope, 3)} ×{" "}
        <strong>{lr.predictor}</strong> &nbsp;(n = {lr.n})
      </p>
      <PValuePanel
        p={lr.pValue}
        extra={[
          { label: "Slope", value: fmt(lr.slope, 4) },
          { label: "Intercept", value: fmt(lr.intercept, 4) },
          { label: "r", value: fmt(lr.r, 3) },
          { label: "R²", value: fmt(lr.r2, 3) },
          { label: "SE(slope)", value: fmt(lr.seSlope, 4) },
          { label: "t (slope)", value: fmt(lr.tSlope, 3) },
        ]}
      />
    </Stack>
  );
}

function LogisticBlock({ lr }: { lr: LogisticRegressionResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Logistic: <strong>{lr.outcome}</strong> (positive = "{lr.positiveValue}") ~{" "}
        <strong>{lr.predictor}</strong> &nbsp;(n = {lr.n}, {lr.iterations} iterations
        {lr.converged ? "" : ", did not fully converge"})
      </p>
      <PValuePanel
        p={lr.pValue}
        extra={[
          { label: "Slope (log-odds per unit)", value: fmt(lr.slope, 4) },
          {
            label: "Odds ratio (95% CI)",
            value: `${fmt(lr.oddsRatio, 3)} (${fmt(lr.oddsRatioCi[0], 3)}, ${fmt(lr.oddsRatioCi[1], 3)})`,
          },
          { label: "Z", value: fmt(lr.z, 3) },
        ]}
      />
    </Stack>
  );
}

function KaplanMeierBlock({ km }: { km: KaplanMeierResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Survival on <strong>{km.timeColumn}</strong>, event = "{km.positiveEventValue}" in{" "}
        <strong>{km.eventColumn}</strong>.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 text-start">Group</th>
              <th className="py-2 text-end">n</th>
              <th className="py-2 text-end">Events</th>
              <th className="py-2 text-end">Median survival</th>
            </tr>
          </thead>
          <tbody>
            {km.groups.map((g) => (
              <tr key={g.name} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <td className="py-1.5 font-medium">{g.name}</td>
                <td className="py-1.5 text-end font-mono">{g.n}</td>
                <td className="py-1.5 text-end font-mono">{g.events}</td>
                <td className="py-1.5 text-end font-mono">
                  {g.medianSurvival !== null ? fmt(g.medianSurvival) : "Not reached"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {km.logRank && (
        <PValuePanel
          p={km.logRank.pValue}
          extra={[
            { label: "Log-rank χ²", value: fmt(km.logRank.chi2, 3) },
            { label: "df", value: String(km.logRank.df) },
          ]}
        />
      )}
    </Stack>
  );
}

function RocBlock({ r }: { r: RocResult }) {
  return (
    <Stack>
      <p className="text-sm">
        n = {r.n} ({r.positives} positive, {r.negatives} negative). AUC ={" "}
        <strong>{fmt(r.auc, 3)}</strong>.
      </p>
      <dl className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
        <StatRow label="Optimal threshold (Youden's J)" value={fmt(r.optimal.threshold, 3)} bold />
        <StatRow label="Sensitivity" value={fmt(r.optimal.sens, 3)} />
        <StatRow label="Specificity" value={fmt(r.optimal.spec, 3)} />
        <StatRow label="PPV" value={fmt(r.optimal.ppv, 3)} />
        <StatRow label="NPV" value={fmt(r.optimal.npv, 3)} />
      </dl>
    </Stack>
  );
}

function NormalityBlock({ n }: { n: NormalityResult }) {
  return (
    <Stack>
      <p className="text-sm">
        Jarque–Bera normality test on <strong>{n.column}</strong> (n = {n.n}).
      </p>
      <dl className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
        <StatRow label="Mean" value={fmt(n.mean)} />
        <StatRow label="SD" value={fmt(n.sd)} />
        <StatRow label="Skewness" value={fmt(n.skewness, 3)} />
        <StatRow label="Kurtosis" value={fmt(n.kurtosis, 3)} />
        <StatRow label="JB statistic" value={fmt(n.jb, 3)} />
        <StatRow label="p-value" value={fmtP(n.pValue)} bold />
      </dl>
      <p
        className={`rounded-md p-3 text-sm ${
          n.conclusion === "consistent_with_normal"
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        }`}
      >
        {n.conclusion === "consistent_with_normal"
          ? "Data are consistent with a normal distribution (p ≥ 0.05)."
          : "Data deviate significantly from normality (p < 0.05). Consider non-parametric tests."}
      </p>
    </Stack>
  );
}

function BoxplotSummary({ b }: { b: BoxplotResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="py-2 text-start">Group</th>
            <th className="py-2 text-end">n</th>
            <th className="py-2 text-end">Min</th>
            <th className="py-2 text-end">Q1</th>
            <th className="py-2 text-end">Median</th>
            <th className="py-2 text-end">Q3</th>
            <th className="py-2 text-end">Max</th>
            <th className="py-2 text-end">Outliers</th>
          </tr>
        </thead>
        <tbody>
          {b.groups.map((g) => (
            <tr key={g.name} className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className="py-1.5 font-medium">{g.name}</td>
              <td className="py-1.5 text-end font-mono">{g.n}</td>
              <td className="py-1.5 text-end font-mono">{fmt(g.min)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(g.q1)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(g.median)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(g.q3)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(g.max)}</td>
              <td className="py-1.5 text-end font-mono">{g.outliers.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScatterSummary({ s }: { s: ScatterResult }) {
  return (
    <p className="text-sm">
      n = {s.n} · r = {fmt(s.r, 3)} · R² = {fmt(s.r2, 3)} · slope = {fmt(s.slope, 3)} · intercept ={" "}
      {fmt(s.intercept, 3)}
    </p>
  );
}
