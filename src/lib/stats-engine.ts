import * as ss from "simple-statistics";

// ─────────────────────────────────────────────────────────────────────────────
// Analysis-kind catalog. Single source of truth for the dropdown + DOCX export.
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYSIS_KINDS = [
  { value: "descriptives", label: "Descriptive statistics" },
  { value: "normality", label: "Normality test (Jarque–Bera)" },
  { value: "compare_means", label: "Welch's t-test (two groups)" },
  { value: "paired_t", label: "Paired t-test" },
  { value: "mann_whitney", label: "Mann–Whitney U (non-parametric, 2 groups)" },
  { value: "wilcoxon", label: "Wilcoxon signed-rank (paired, non-parametric)" },
  { value: "anova", label: "One-way ANOVA (3+ groups)" },
  { value: "kruskal_wallis", label: "Kruskal–Wallis (non-parametric ANOVA)" },
  { value: "chi_square", label: "Chi-square / Fisher's exact" },
  { value: "correlation", label: "Correlation matrix (Pearson)" },
  { value: "linear_regression", label: "Linear regression" },
  { value: "logistic_regression", label: "Logistic regression (binary outcome)" },
  { value: "kaplan_meier", label: "Kaplan–Meier + log-rank survival" },
  { value: "roc", label: "ROC curve / diagnostic accuracy" },
  { value: "histogram", label: "Histogram" },
  { value: "boxplot", label: "Box plot by group" },
  { value: "scatter", label: "Scatter plot" },
] as const;

export type AnalysisKind = (typeof ANALYSIS_KINDS)[number]["value"];

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing — minimal, RFC-4180-ish (handles quoted fields with commas).
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedCsv = {
  columns: string[];
  rows: string[][];
  numericColumns: string[];
  categoricalColumns: string[];
  binaryColumns: string[];
};

export function parseCsv(text: string): ParsedCsv {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";

  const records: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuote = true;
    } else if (c === delim) {
      cur.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(field);
      records.push(cur);
      cur = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    records.push(cur);
  }

  const filtered = records.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (filtered.length === 0) {
    return {
      columns: [],
      rows: [],
      numericColumns: [],
      categoricalColumns: [],
      binaryColumns: [],
    };
  }
  const columns = filtered[0].map((c, i) => c.trim() || `col_${i + 1}`);
  const rows = filtered.slice(1);

  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const binaryColumns: string[] = [];
  for (let ci = 0; ci < columns.length; ci++) {
    let nonEmpty = 0;
    let numeric = 0;
    const distinct = new Set<string>();
    for (const r of rows) {
      const v = (r[ci] ?? "").trim();
      if (v === "") continue;
      nonEmpty++;
      distinct.add(v);
      if (Number.isFinite(Number(v))) numeric++;
    }
    if (nonEmpty > 0 && numeric / nonEmpty >= 0.6) numericColumns.push(columns[ci]);
    else categoricalColumns.push(columns[ci]);
    if (distinct.size === 2 && nonEmpty > 0) binaryColumns.push(columns[ci]);
  }

  return { columns, rows, numericColumns, categoricalColumns, binaryColumns };
}

function columnIndex(parsed: ParsedCsv, columnName: string): number {
  const i = parsed.columns.indexOf(columnName);
  if (i === -1) throw new Error(`Column not found: ${columnName}`);
  return i;
}

function numericValues(parsed: ParsedCsv, columnName: string): number[] {
  const idx = columnIndex(parsed, columnName);
  const out: number[] = [];
  for (const r of parsed.rows) {
    const v = (r[idx] ?? "").trim();
    if (v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function pairedNumericValues(
  parsed: ParsedCsv,
  col1: string,
  col2: string
): { x: number[]; y: number[] } {
  const i1 = columnIndex(parsed, col1);
  const i2 = columnIndex(parsed, col2);
  const x: number[] = [];
  const y: number[] = [];
  for (const r of parsed.rows) {
    const a = (r[i1] ?? "").trim();
    const b = (r[i2] ?? "").trim();
    if (a === "" || b === "") continue;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) continue;
    x.push(na);
    y.push(nb);
  }
  return { x, y };
}

function distinctValues(parsed: ParsedCsv, columnName: string): string[] {
  const idx = columnIndex(parsed, columnName);
  const set = new Set<string>();
  for (const r of parsed.rows) {
    const v = (r[idx] ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

export function distinctValuesFor(parsed: ParsedCsv, columnName: string): string[] {
  return distinctValues(parsed, columnName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Math primitives: lnGamma, regularised incomplete beta/gamma, normal CDF.
// ─────────────────────────────────────────────────────────────────────────────

function lnGamma(z: number): number {
  // Lanczos
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function logFact(n: number): number {
  return lnGamma(n + 1);
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-10;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regIncBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a + b) - lnGamma(a) - lnGamma(b);
  const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaCF(x, a, b)) / a;
  }
  return 1 - (front * betaCF(1 - x, b, a)) / b;
}

function regIncGammaP(s: number, x: number): number {
  if (x < 0 || s <= 0) return NaN;
  if (x === 0) return 0;
  if (x < s + 1) {
    let term = 1 / s;
    let sum = term;
    for (let n = 1; n < 200; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  let b = x + 1 - s;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  const Q = Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
  return 1 - Q;
}

function chiSquarePValue(chi2: number, df: number): number {
  if (!Number.isFinite(chi2) || chi2 <= 0 || df <= 0) return 1;
  return 1 - regIncGammaP(df / 2, chi2 / 2);
}

function tDistTwoTailed(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  return regIncBeta(x, df / 2, 0.5);
}

function fPValue(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return regIncBeta(x, df2 / 2, df1 / 2);
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function normalPValueTwoTailed(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

// Mid-rank for ranks with ties.
function ranks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const meanRank = (i + j + 2) / 2; // 1-indexed
    for (let k = i; k <= j; k++) out[indexed[k].i] = meanRank;
    i = j + 1;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Descriptive statistics
// ─────────────────────────────────────────────────────────────────────────────

export type DescriptiveRow = {
  column: string;
  n: number;
  missing: number;
  mean: number;
  median: number;
  sd: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
};

export function descriptivesFor(parsed: ParsedCsv, columns?: string[]): DescriptiveRow[] {
  const cols = columns && columns.length > 0 ? columns : parsed.numericColumns;
  return cols.map((c) => {
    const values = numericValues(parsed, c);
    const idx = columnIndex(parsed, c);
    const totalCells = parsed.rows.length;
    const nonEmpty = parsed.rows.filter((r) => (r[idx] ?? "").trim().length > 0).length;
    if (values.length === 0) {
      return {
        column: c,
        n: 0,
        missing: totalCells,
        mean: NaN,
        median: NaN,
        sd: NaN,
        min: NaN,
        max: NaN,
        q1: NaN,
        q3: NaN,
      };
    }
    return {
      column: c,
      n: values.length,
      missing: totalCells - nonEmpty,
      mean: ss.mean(values),
      median: ss.median(values),
      sd: values.length > 1 ? ss.sampleStandardDeviation(values) : 0,
      min: ss.min(values),
      max: ss.max(values),
      q1: ss.quantile(values, 0.25),
      q3: ss.quantile(values, 0.75),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Welch's t-test for two independent groups
// ─────────────────────────────────────────────────────────────────────────────

export type TTestResult = {
  group1: { name: string; n: number; mean: number; sd: number };
  group2: { name: string; n: number; mean: number; sd: number };
  meanDifference: number;
  t: number;
  df: number;
  pValue: number;
};

export function tTestBetween(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): TTestResult {
  const outIdx = columnIndex(parsed, outcomeColumn);
  const grpIdx = columnIndex(parsed, groupColumn);

  const groups = new Map<string, number[]>();
  for (const r of parsed.rows) {
    const g = (r[grpIdx] ?? "").trim();
    const v = (r[outIdx] ?? "").trim();
    if (g === "" || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(n);
  }

  const groupNames = Array.from(groups.keys());
  if (groupNames.length < 2) {
    throw new Error(
      `Need at least 2 distinct groups in "${groupColumn}" (found ${groupNames.length}).`
    );
  }
  const sorted = groupNames
    .map((n) => ({ n, vals: groups.get(n)! }))
    .sort((a, b) => b.vals.length - a.vals.length);
  const [a, b] = sorted;

  const m1 = ss.mean(a.vals);
  const m2 = ss.mean(b.vals);
  const s1 = a.vals.length > 1 ? ss.sampleStandardDeviation(a.vals) : 0;
  const s2 = b.vals.length > 1 ? ss.sampleStandardDeviation(b.vals) : 0;
  const n1 = a.vals.length;
  const n2 = b.vals.length;

  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  const t = se > 0 ? (m1 - m2) / se : 0;
  const num = Math.pow((s1 * s1) / n1 + (s2 * s2) / n2, 2);
  const den =
    Math.pow((s1 * s1) / n1, 2) / Math.max(1, n1 - 1) +
    Math.pow((s2 * s2) / n2, 2) / Math.max(1, n2 - 1);
  const df = den > 0 ? num / den : Math.max(1, n1 + n2 - 2);

  return {
    group1: { name: a.n, n: n1, mean: m1, sd: s1 },
    group2: { name: b.n, n: n2, mean: m2, sd: s2 },
    meanDifference: m1 - m2,
    t,
    df,
    pValue: tDistTwoTailed(Math.abs(t), df),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Paired t-test
// ─────────────────────────────────────────────────────────────────────────────

export type PairedTResult = {
  col1: string;
  col2: string;
  n: number;
  meanDiff: number;
  sdDiff: number;
  t: number;
  df: number;
  pValue: number;
};

export function pairedTTest(
  parsed: ParsedCsv,
  col1: string,
  col2: string
): PairedTResult {
  const { x, y } = pairedNumericValues(parsed, col1, col2);
  if (x.length < 2) {
    throw new Error("Need at least 2 paired observations.");
  }
  const diffs = x.map((v, i) => v - y[i]);
  const m = ss.mean(diffs);
  const sd = ss.sampleStandardDeviation(diffs);
  const n = diffs.length;
  const t = sd > 0 ? m / (sd / Math.sqrt(n)) : 0;
  const df = n - 1;
  return {
    col1,
    col2,
    n,
    meanDiff: m,
    sdDiff: sd,
    t,
    df,
    pValue: tDistTwoTailed(Math.abs(t), df),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mann-Whitney U
// ─────────────────────────────────────────────────────────────────────────────

export type MannWhitneyResult = {
  outcome: string;
  group: string;
  group1: { name: string; n: number; meanRank: number; sumRank: number };
  group2: { name: string; n: number; meanRank: number; sumRank: number };
  u1: number;
  u2: number;
  u: number;
  z: number;
  pValue: number;
};

export function mannWhitneyU(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): MannWhitneyResult {
  const outIdx = columnIndex(parsed, outcomeColumn);
  const grpIdx = columnIndex(parsed, groupColumn);
  const all: { v: number; g: string }[] = [];
  for (const r of parsed.rows) {
    const g = (r[grpIdx] ?? "").trim();
    const v = (r[outIdx] ?? "").trim();
    if (g === "" || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    all.push({ v: n, g });
  }
  const groupNames = Array.from(new Set(all.map((a) => a.g))).sort();
  if (groupNames.length < 2) {
    throw new Error(`Need at least 2 distinct groups in "${groupColumn}".`);
  }
  const sortedNames = groupNames
    .map((n) => ({ n, count: all.filter((a) => a.g === n).length }))
    .sort((a, b) => b.count - a.count);
  const g1 = sortedNames[0].n;
  const g2 = sortedNames[1].n;
  const filtered = all.filter((a) => a.g === g1 || a.g === g2);
  const r = ranks(filtered.map((a) => a.v));
  let R1 = 0;
  let R2 = 0;
  let n1 = 0;
  let n2 = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].g === g1) {
      R1 += r[i];
      n1++;
    } else {
      R2 += r[i];
      n2++;
    }
  }
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = R2 - (n2 * (n2 + 1)) / 2;
  const U = Math.min(U1, U2);

  // Tie-corrected variance.
  const tieGroups = new Map<number, number>();
  for (const v of filtered) {
    tieGroups.set(v.v, (tieGroups.get(v.v) ?? 0) + 1);
  }
  let tieSum = 0;
  for (const t of tieGroups.values()) {
    if (t > 1) tieSum += t * t * t - t;
  }
  const N = n1 + n2;
  const meanU = (n1 * n2) / 2;
  const varU =
    ((n1 * n2) / 12) * (N + 1 - tieSum / (N * (N - 1) || 1));
  const z = varU > 0 ? (U - meanU) / Math.sqrt(varU) : 0;
  return {
    outcome: outcomeColumn,
    group: groupColumn,
    group1: { name: g1, n: n1, sumRank: R1, meanRank: n1 > 0 ? R1 / n1 : 0 },
    group2: { name: g2, n: n2, sumRank: R2, meanRank: n2 > 0 ? R2 / n2 : 0 },
    u1: U1,
    u2: U2,
    u: U,
    z,
    pValue: normalPValueTwoTailed(z),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wilcoxon signed-rank (paired non-parametric)
// ─────────────────────────────────────────────────────────────────────────────

export type WilcoxonResult = {
  col1: string;
  col2: string;
  n: number;
  wPositive: number;
  wNegative: number;
  w: number;
  z: number;
  pValue: number;
};

export function wilcoxonSignedRank(
  parsed: ParsedCsv,
  col1: string,
  col2: string
): WilcoxonResult {
  const { x, y } = pairedNumericValues(parsed, col1, col2);
  const diffs: number[] = [];
  for (let i = 0; i < x.length; i++) {
    const d = x[i] - y[i];
    if (d !== 0) diffs.push(d);
  }
  if (diffs.length < 1) throw new Error("All paired differences were zero.");
  const absDiffs = diffs.map(Math.abs);
  const r = ranks(absDiffs);
  let wPos = 0;
  let wNeg = 0;
  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i] > 0) wPos += r[i];
    else wNeg += r[i];
  }
  const W = Math.min(wPos, wNeg);
  const n = diffs.length;
  const meanW = (n * (n + 1)) / 4;
  // Tie correction
  const tieGroups = new Map<number, number>();
  for (const v of absDiffs) tieGroups.set(v, (tieGroups.get(v) ?? 0) + 1);
  let tieSum = 0;
  for (const t of tieGroups.values()) {
    if (t > 1) tieSum += (t * t * t - t) / 48;
  }
  const varW = (n * (n + 1) * (2 * n + 1)) / 24 - tieSum;
  const z = varW > 0 ? (W - meanW) / Math.sqrt(varW) : 0;
  return {
    col1,
    col2,
    n,
    wPositive: wPos,
    wNegative: wNeg,
    w: W,
    z,
    pValue: normalPValueTwoTailed(z),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// One-way ANOVA
// ─────────────────────────────────────────────────────────────────────────────

export type AnovaResult = {
  outcome: string;
  group: string;
  groups: { name: string; n: number; mean: number; sd: number }[];
  ssBetween: number;
  ssWithin: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  f: number;
  pValue: number;
};

function collectGroups(
  parsed: ParsedCsv,
  outcomeCol: string,
  groupCol: string
): Map<string, number[]> {
  const outIdx = columnIndex(parsed, outcomeCol);
  const grpIdx = columnIndex(parsed, groupCol);
  const groups = new Map<string, number[]>();
  for (const r of parsed.rows) {
    const g = (r[grpIdx] ?? "").trim();
    const v = (r[outIdx] ?? "").trim();
    if (g === "" || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(n);
  }
  return groups;
}

export function oneWayAnova(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): AnovaResult {
  const groups = collectGroups(parsed, outcomeColumn, groupColumn);
  const names = Array.from(groups.keys());
  if (names.length < 2) {
    throw new Error(`Need at least 2 groups in "${groupColumn}".`);
  }
  let total = 0;
  let N = 0;
  const summaries = names.map((n) => {
    const vals = groups.get(n)!;
    total += vals.reduce((s, v) => s + v, 0);
    N += vals.length;
    return {
      name: n,
      n: vals.length,
      mean: ss.mean(vals),
      sd: vals.length > 1 ? ss.sampleStandardDeviation(vals) : 0,
      vals,
    };
  });
  const grandMean = total / N;
  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of summaries) {
    ssBetween += g.n * Math.pow(g.mean - grandMean, 2);
    for (const v of g.vals) ssWithin += Math.pow(v - g.mean, 2);
  }
  const k = summaries.length;
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const f = msWithin > 0 ? msBetween / msWithin : 0;
  return {
    outcome: outcomeColumn,
    group: groupColumn,
    groups: summaries.map(({ name, n, mean, sd }) => ({ name, n, mean, sd })),
    ssBetween,
    ssWithin,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    f,
    pValue: fPValue(f, dfBetween, dfWithin),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kruskal-Wallis
// ─────────────────────────────────────────────────────────────────────────────

export type KruskalWallisResult = {
  outcome: string;
  group: string;
  groups: { name: string; n: number; meanRank: number }[];
  h: number;
  df: number;
  pValue: number;
};

export function kruskalWallis(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): KruskalWallisResult {
  const groups = collectGroups(parsed, outcomeColumn, groupColumn);
  const names = Array.from(groups.keys());
  if (names.length < 2) {
    throw new Error(`Need at least 2 groups in "${groupColumn}".`);
  }
  // Concatenate, rank, then sum per group.
  const flat: { v: number; g: string }[] = [];
  for (const [g, vals] of groups) for (const v of vals) flat.push({ v, g });
  const r = ranks(flat.map((f) => f.v));
  const sumByGroup = new Map<string, number>();
  const nByGroup = new Map<string, number>();
  for (let i = 0; i < flat.length; i++) {
    sumByGroup.set(flat[i].g, (sumByGroup.get(flat[i].g) ?? 0) + r[i]);
    nByGroup.set(flat[i].g, (nByGroup.get(flat[i].g) ?? 0) + 1);
  }
  const N = flat.length;
  let H = 0;
  for (const g of names) {
    const ni = nByGroup.get(g) ?? 0;
    const Ri = sumByGroup.get(g) ?? 0;
    if (ni > 0) H += (Ri * Ri) / ni;
  }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);

  // Tie correction
  const tieGroups = new Map<number, number>();
  for (const f of flat) tieGroups.set(f.v, (tieGroups.get(f.v) ?? 0) + 1);
  let C = 0;
  for (const t of tieGroups.values()) if (t > 1) C += t * t * t - t;
  if (C > 0) H = H / (1 - C / (N * N * N - N));

  const df = names.length - 1;
  return {
    outcome: outcomeColumn,
    group: groupColumn,
    groups: names.map((n) => ({
      name: n,
      n: nByGroup.get(n) ?? 0,
      meanRank: (sumByGroup.get(n) ?? 0) / Math.max(1, nByGroup.get(n) ?? 1),
    })),
    h: H,
    df,
    pValue: chiSquarePValue(H, df),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chi-square / Fisher's exact (categorical × categorical)
// ─────────────────────────────────────────────────────────────────────────────

export type ChiSquareResult = {
  rowVar: string;
  colVar: string;
  rowLevels: string[];
  colLevels: string[];
  observed: number[][];
  expected: number[][];
  chi2: number;
  df: number;
  pValue: number;
  warning?: string;
  fisherP?: number;
};

export function chiSquareTest(
  parsed: ParsedCsv,
  rowVar: string,
  colVar: string
): ChiSquareResult {
  const ri = columnIndex(parsed, rowVar);
  const ci = columnIndex(parsed, colVar);
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const r of parsed.rows) {
    const a = (r[ri] ?? "").trim();
    const b = (r[ci] ?? "").trim();
    if (a && b) {
      rowSet.add(a);
      colSet.add(b);
    }
  }
  const rowLevels = Array.from(rowSet).sort();
  const colLevels = Array.from(colSet).sort();
  if (rowLevels.length < 2 || colLevels.length < 2) {
    throw new Error("Each variable needs at least 2 distinct values.");
  }
  const observed: number[][] = rowLevels.map(() => colLevels.map(() => 0));
  for (const r of parsed.rows) {
    const a = (r[ri] ?? "").trim();
    const b = (r[ci] ?? "").trim();
    if (!a || !b) continue;
    const ra = rowLevels.indexOf(a);
    const cb = colLevels.indexOf(b);
    if (ra >= 0 && cb >= 0) observed[ra][cb]++;
  }
  const rowTotals = observed.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = colLevels.map((_, j) => observed.reduce((s, row) => s + row[j], 0));
  const N = rowTotals.reduce((s, v) => s + v, 0);
  const expected: number[][] = rowLevels.map((_, i) =>
    colLevels.map((_, j) => (rowTotals[i] * colTotals[j]) / N)
  );
  let chi2 = 0;
  let lowExpected = 0;
  for (let i = 0; i < rowLevels.length; i++) {
    for (let j = 0; j < colLevels.length; j++) {
      const e = expected[i][j];
      if (e > 0) chi2 += Math.pow(observed[i][j] - e, 2) / e;
      if (e < 5) lowExpected++;
    }
  }
  const df = (rowLevels.length - 1) * (colLevels.length - 1);
  const pValue = chiSquarePValue(chi2, df);

  const result: ChiSquareResult = {
    rowVar,
    colVar,
    rowLevels,
    colLevels,
    observed,
    expected,
    chi2,
    df,
    pValue,
  };

  if (lowExpected > 0) {
    result.warning = `${lowExpected} cell(s) have expected count < 5 — Fisher's exact recommended.`;
  }

  // 2x2: also compute Fisher's exact two-sided.
  if (rowLevels.length === 2 && colLevels.length === 2) {
    result.fisherP = fisherExactTwoSided(
      observed[0][0],
      observed[0][1],
      observed[1][0],
      observed[1][1]
    );
  }

  return result;
}

function fisherExactTwoSided(a: number, b: number, c: number, d: number): number {
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;
  const N = row1 + row2;
  if (row1 === 0 || row2 === 0 || col1 === 0 || col2 === 0) return 1;
  const observedLogP = hypergeomLogProb(a, row1, row2, col1);
  const aMin = Math.max(0, col1 - row2);
  const aMax = Math.min(row1, col1);
  let pSum = 0;
  for (let x = aMin; x <= aMax; x++) {
    const lp = hypergeomLogProb(x, row1, row2, col1);
    if (lp <= observedLogP + 1e-9) pSum += Math.exp(lp);
  }
  return Math.min(1, pSum);
}

function hypergeomLogProb(
  a: number,
  row1: number,
  row2: number,
  col1: number
): number {
  const b = row1 - a;
  const c = col1 - a;
  const d = row2 - c;
  if (a < 0 || b < 0 || c < 0 || d < 0) return -Infinity;
  return (
    logFact(row1) +
    logFact(row2) +
    logFact(col1) +
    logFact(row1 + row2 - col1) -
    logFact(row1 + row2) -
    logFact(a) -
    logFact(b) -
    logFact(c) -
    logFact(d)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pearson correlation matrix
// ─────────────────────────────────────────────────────────────────────────────

export type CorrelationCell = {
  rowColumn: string;
  colColumn: string;
  r: number;
  n: number;
};

export function correlationMatrix(
  parsed: ParsedCsv,
  columns?: string[]
): { columns: string[]; cells: CorrelationCell[] } {
  const cols = columns && columns.length > 0 ? columns : parsed.numericColumns;
  const cells: CorrelationCell[] = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = 0; j < cols.length; j++) {
      const { x, y } = pairedNumericValues(parsed, cols[i], cols[j]);
      const r = x.length >= 2 ? ss.sampleCorrelation(x, y) : NaN;
      cells.push({ rowColumn: cols[i], colColumn: cols[j], r, n: x.length });
    }
  }
  return { columns: cols, cells };
}

// ─────────────────────────────────────────────────────────────────────────────
// Linear regression (simple, one predictor)
// ─────────────────────────────────────────────────────────────────────────────

export type LinearRegressionResult = {
  outcome: string;
  predictor: string;
  n: number;
  intercept: number;
  slope: number;
  r: number;
  r2: number;
  seSlope: number;
  tSlope: number;
  pValue: number;
  points: { x: number; y: number }[];
};

export function linearRegression(
  parsed: ParsedCsv,
  outcome: string,
  predictor: string
): LinearRegressionResult {
  const { x: xs, y: ys } = pairedNumericValues(parsed, predictor, outcome);
  const n = xs.length;
  if (n < 3) throw new Error("Need at least 3 paired observations.");
  const mx = ss.mean(xs);
  const my = ss.mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += Math.pow(xs[i] - mx, 2);
    syy += Math.pow(ys[i] - my, 2);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  const r2 = r * r;
  // Residual SE
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yhat = intercept + slope * xs[i];
    ssRes += Math.pow(ys[i] - yhat, 2);
  }
  const seRes = Math.sqrt(ssRes / Math.max(1, n - 2));
  const seSlope = sxx > 0 ? seRes / Math.sqrt(sxx) : NaN;
  const tSlope = seSlope > 0 ? slope / seSlope : 0;
  const pValue = tDistTwoTailed(Math.abs(tSlope), n - 2);
  return {
    outcome,
    predictor,
    n,
    intercept,
    slope,
    r,
    r2,
    seSlope,
    tSlope,
    pValue,
    points: xs.map((x, i) => ({ x, y: ys[i] })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logistic regression (univariate; binary outcome via positiveValue param)
// ─────────────────────────────────────────────────────────────────────────────

export type LogisticRegressionResult = {
  outcome: string;
  predictor: string;
  positiveValue: string;
  n: number;
  intercept: number;
  slope: number;
  seSlope: number;
  z: number;
  pValue: number;
  oddsRatio: number;
  oddsRatioCi: [number, number];
  iterations: number;
  converged: boolean;
  curve: { x: number; p: number }[];
  points: { x: number; y: number }[];
};

export function logisticRegression(
  parsed: ParsedCsv,
  outcomeColumn: string,
  predictorColumn: string,
  positiveValue: string
): LogisticRegressionResult {
  const outIdx = columnIndex(parsed, outcomeColumn);
  const prIdx = columnIndex(parsed, predictorColumn);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of parsed.rows) {
    const ov = (r[outIdx] ?? "").trim();
    const pv = (r[prIdx] ?? "").trim();
    if (ov === "" || pv === "") continue;
    const x = Number(pv);
    if (!Number.isFinite(x)) continue;
    xs.push(x);
    ys.push(ov === positiveValue ? 1 : 0);
  }
  const n = xs.length;
  if (n < 5) throw new Error("Need at least 5 paired observations.");
  const yMean = ys.reduce((s, v) => s + v, 0) / n;
  if (yMean === 0 || yMean === 1) {
    throw new Error("Outcome is constant — can't fit logistic regression.");
  }

  // Newton-Raphson IRLS for logit(p) = b0 + b1*x
  let b0 = Math.log(yMean / (1 - yMean));
  let b1 = 0;
  let iterations = 0;
  let converged = false;
  for (iterations = 0; iterations < 50; iterations++) {
    let s00 = 0;
    let s01 = 0;
    let s11 = 0;
    let g0 = 0;
    let g1 = 0;
    for (let i = 0; i < n; i++) {
      const z = b0 + b1 * xs[i];
      const p = 1 / (1 + Math.exp(-z));
      const w = p * (1 - p);
      s00 += w;
      s01 += w * xs[i];
      s11 += w * xs[i] * xs[i];
      g0 += ys[i] - p;
      g1 += (ys[i] - p) * xs[i];
    }
    const det = s00 * s11 - s01 * s01;
    if (Math.abs(det) < 1e-12) break;
    const d0 = (s11 * g0 - s01 * g1) / det;
    const d1 = (-s01 * g0 + s00 * g1) / det;
    b0 += d0;
    b1 += d1;
    if (Math.abs(d0) + Math.abs(d1) < 1e-8) {
      converged = true;
      break;
    }
  }

  // SE from Fisher info at convergence
  let s00 = 0;
  let s01 = 0;
  let s11 = 0;
  let llNull = 0;
  let llFull = 0;
  for (let i = 0; i < n; i++) {
    const z = b0 + b1 * xs[i];
    const p = 1 / (1 + Math.exp(-z));
    const w = p * (1 - p);
    s00 += w;
    s01 += w * xs[i];
    s11 += w * xs[i] * xs[i];
    llFull += ys[i] === 1 ? Math.log(Math.max(p, 1e-15)) : Math.log(Math.max(1 - p, 1e-15));
    llNull += ys[i] === 1 ? Math.log(Math.max(yMean, 1e-15)) : Math.log(Math.max(1 - yMean, 1e-15));
  }
  const det = s00 * s11 - s01 * s01;
  const seSlope = Math.abs(det) > 1e-12 ? Math.sqrt(s00 / det) : NaN;
  const z = Number.isFinite(seSlope) && seSlope > 0 ? b1 / seSlope : 0;
  const pValue = normalPValueTwoTailed(z);

  const xMin = ss.min(xs);
  const xMax = ss.max(xs);
  const curve: { x: number; p: number }[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = xMin + ((xMax - xMin) * i) / 80;
    const zz = b0 + b1 * x;
    curve.push({ x, p: 1 / (1 + Math.exp(-zz)) });
  }

  return {
    outcome: outcomeColumn,
    predictor: predictorColumn,
    positiveValue,
    n,
    intercept: b0,
    slope: b1,
    seSlope,
    z,
    pValue,
    oddsRatio: Math.exp(b1),
    oddsRatioCi: Number.isFinite(seSlope)
      ? [Math.exp(b1 - 1.96 * seSlope), Math.exp(b1 + 1.96 * seSlope)]
      : [NaN, NaN],
    iterations,
    converged,
    curve,
    points: xs.map((x, i) => ({ x, y: ys[i] })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kaplan-Meier survival + log-rank
// ─────────────────────────────────────────────────────────────────────────────

export type KaplanMeierGroup = {
  name: string;
  n: number;
  events: number;
  medianSurvival: number | null;
  points: { t: number; s: number; nAtRisk: number; nEvents: number }[];
};

export type KaplanMeierResult = {
  timeColumn: string;
  eventColumn: string;
  groupColumn?: string;
  positiveEventValue: string;
  groups: KaplanMeierGroup[];
  logRank?: { chi2: number; df: number; pValue: number };
};

export function kaplanMeier(
  parsed: ParsedCsv,
  timeColumn: string,
  eventColumn: string,
  positiveEventValue: string,
  groupColumn?: string
): KaplanMeierResult {
  const tIdx = columnIndex(parsed, timeColumn);
  const eIdx = columnIndex(parsed, eventColumn);
  const gIdx = groupColumn ? columnIndex(parsed, groupColumn) : -1;

  type Obs = { t: number; e: 0 | 1; g: string };
  const obs: Obs[] = [];
  for (const r of parsed.rows) {
    const tv = (r[tIdx] ?? "").trim();
    const ev = (r[eIdx] ?? "").trim();
    if (tv === "" || ev === "") continue;
    const t = Number(tv);
    if (!Number.isFinite(t) || t < 0) continue;
    const e = ev === positiveEventValue ? 1 : 0;
    const g = gIdx >= 0 ? (r[gIdx] ?? "").trim() : "All";
    if (gIdx >= 0 && !g) continue;
    obs.push({ t, e: e as 0 | 1, g });
  }
  if (obs.length === 0) throw new Error("No survival data found.");

  const groupNames = groupColumn
    ? Array.from(new Set(obs.map((o) => o.g))).sort()
    : ["All"];
  const groups: KaplanMeierGroup[] = groupNames.map((g) => {
    const subset = obs.filter((o) => o.g === g).sort((a, b) => a.t - b.t);
    const points: { t: number; s: number; nAtRisk: number; nEvents: number }[] = [];
    let s = 1;
    let nRisk = subset.length;
    let i = 0;
    let medianSurv: number | null = null;
    points.push({ t: 0, s: 1, nAtRisk: nRisk, nEvents: 0 });
    while (i < subset.length) {
      const t = subset[i].t;
      let events = 0;
      let n = 0;
      while (i < subset.length && subset[i].t === t) {
        if (subset[i].e === 1) events++;
        n++;
        i++;
      }
      if (events > 0 && nRisk > 0) {
        s *= 1 - events / nRisk;
      }
      points.push({ t, s, nAtRisk: nRisk, nEvents: events });
      if (medianSurv === null && s <= 0.5) medianSurv = t;
      nRisk -= n;
    }
    return {
      name: g,
      n: subset.length,
      events: subset.filter((o) => o.e === 1).length,
      medianSurvival: medianSurv,
      points,
    };
  });

  let logRank: { chi2: number; df: number; pValue: number } | undefined;
  if (groupNames.length === 2) {
    // Log-rank between two groups
    const sorted = obs.slice().sort((a, b) => a.t - b.t);
    const eventTimes = Array.from(new Set(sorted.filter((o) => o.e === 1).map((o) => o.t))).sort(
      (a, b) => a - b
    );
    let oMinusE1 = 0;
    let varSum = 0;
    for (const t of eventTimes) {
      const atRisk1 = sorted.filter((o) => o.t >= t && o.g === groupNames[0]).length;
      const atRisk2 = sorted.filter((o) => o.t >= t && o.g === groupNames[1]).length;
      const events1 = sorted.filter((o) => o.t === t && o.e === 1 && o.g === groupNames[0]).length;
      const events2 = sorted.filter((o) => o.t === t && o.e === 1 && o.g === groupNames[1]).length;
      const dj = events1 + events2;
      const nj = atRisk1 + atRisk2;
      if (nj < 2) continue;
      const e1 = (atRisk1 / nj) * dj;
      const v = (atRisk1 * atRisk2 * dj * (nj - dj)) / (nj * nj * (nj - 1));
      oMinusE1 += events1 - e1;
      varSum += v;
    }
    const chi2 = varSum > 0 ? (oMinusE1 * oMinusE1) / varSum : 0;
    logRank = { chi2, df: 1, pValue: chiSquarePValue(chi2, 1) };
  }

  return {
    timeColumn,
    eventColumn,
    groupColumn,
    positiveEventValue,
    groups,
    logRank,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROC curve / AUC / diagnostic accuracy
// ─────────────────────────────────────────────────────────────────────────────

export type RocResult = {
  outcome: string;
  predictor: string;
  positiveValue: string;
  n: number;
  positives: number;
  negatives: number;
  auc: number;
  optimal: { threshold: number; sens: number; spec: number; ppv: number; npv: number };
  points: { threshold: number; sens: number; spec: number; tpr: number; fpr: number }[];
};

export function rocCurve(
  parsed: ParsedCsv,
  outcomeColumn: string,
  predictorColumn: string,
  positiveValue: string
): RocResult {
  const oi = columnIndex(parsed, outcomeColumn);
  const pi = columnIndex(parsed, predictorColumn);
  const data: { score: number; y: 0 | 1 }[] = [];
  for (const r of parsed.rows) {
    const ov = (r[oi] ?? "").trim();
    const pv = (r[pi] ?? "").trim();
    if (ov === "" || pv === "") continue;
    const s = Number(pv);
    if (!Number.isFinite(s)) continue;
    data.push({ score: s, y: ov === positiveValue ? 1 : 0 });
  }
  if (data.length === 0) throw new Error("No data for ROC.");
  data.sort((a, b) => b.score - a.score);
  const positives = data.filter((d) => d.y === 1).length;
  const negatives = data.length - positives;
  if (positives === 0 || negatives === 0) {
    throw new Error("Outcome must have at least one positive and one negative.");
  }
  const points: RocResult["points"] = [];
  let tp = 0;
  let fp = 0;
  let prevScore = Infinity;
  // Add (0,0) point
  points.push({ threshold: Infinity, sens: 0, spec: 1, tpr: 0, fpr: 0 });
  for (const d of data) {
    if (d.score !== prevScore) {
      const sens = tp / positives;
      const spec = (negatives - fp) / negatives;
      points.push({ threshold: d.score, sens, spec, tpr: sens, fpr: 1 - spec });
      prevScore = d.score;
    }
    if (d.y === 1) tp++;
    else fp++;
  }
  points.push({ threshold: -Infinity, sens: 1, spec: 0, tpr: 1, fpr: 1 });

  // AUC = trapezoidal sum on (FPR, TPR)
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    auc += ((points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr)) / 2;
  }

  // Optimal: max Youden's J = sens + spec - 1
  let best = points[0];
  let bestJ = -Infinity;
  for (const p of points) {
    const j = p.sens + p.spec - 1;
    if (j > bestJ && Number.isFinite(p.threshold)) {
      bestJ = j;
      best = p;
    }
  }
  // Compute PPV/NPV at optimal
  const tpAt = positives * best.sens;
  const fnAt = positives - tpAt;
  const tnAt = negatives * best.spec;
  const fpAt = negatives - tnAt;
  const ppv = tpAt + fpAt > 0 ? tpAt / (tpAt + fpAt) : 0;
  const npv = tnAt + fnAt > 0 ? tnAt / (tnAt + fnAt) : 0;

  return {
    outcome: outcomeColumn,
    predictor: predictorColumn,
    positiveValue,
    n: data.length,
    positives,
    negatives,
    auc,
    optimal: { threshold: best.threshold, sens: best.sens, spec: best.spec, ppv, npv },
    points,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normality (Jarque-Bera)
// ─────────────────────────────────────────────────────────────────────────────

export type NormalityResult = {
  column: string;
  n: number;
  mean: number;
  sd: number;
  skewness: number;
  kurtosis: number;
  jb: number;
  pValue: number;
  conclusion: "consistent_with_normal" | "deviates_from_normal";
};

export function normalityTest(parsed: ParsedCsv, columnName: string): NormalityResult {
  const values = numericValues(parsed, columnName);
  const n = values.length;
  if (n < 4) throw new Error("Need at least 4 observations for normality test.");
  const m = ss.mean(values);
  const sd = ss.sampleStandardDeviation(values);
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    m3 += Math.pow(v - m, 3);
    m4 += Math.pow(v - m, 4);
  }
  m3 /= n;
  m4 /= n;
  const skew = m3 / Math.pow(sd, 3);
  const kurt = m4 / Math.pow(sd, 4);
  const jb = (n / 6) * (skew * skew + Math.pow(kurt - 3, 2) / 4);
  const pValue = chiSquarePValue(jb, 2);
  return {
    column: columnName,
    n,
    mean: m,
    sd,
    skewness: skew,
    kurtosis: kurt,
    jb,
    pValue,
    conclusion: pValue < 0.05 ? "deviates_from_normal" : "consistent_with_normal",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Histogram bins
// ─────────────────────────────────────────────────────────────────────────────

export type HistogramBins = {
  column: string;
  bins: { start: number; end: number; count: number }[];
  n: number;
  min: number;
  max: number;
  mean: number;
};

export function histogramFor(
  parsed: ParsedCsv,
  columnName: string,
  numBins = 10
): HistogramBins {
  const values = numericValues(parsed, columnName);
  if (values.length === 0) {
    return { column: columnName, bins: [], n: 0, min: 0, max: 0, mean: 0 };
  }
  const min = ss.min(values);
  const max = ss.max(values);
  const range = max - min || 1;
  const width = range / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let bi = Math.floor((v - min) / width);
    if (bi >= numBins) bi = numBins - 1;
    bins[bi].count++;
  }
  return { column: columnName, bins, n: values.length, min, max, mean: ss.mean(values) };
}

export type GroupMeansRow = { group: string; n: number; mean: number; sd: number };

export function groupMeansFor(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): GroupMeansRow[] {
  const groups = collectGroups(parsed, outcomeColumn, groupColumn);
  return Array.from(groups.entries())
    .map(([group, vals]) => ({
      group,
      n: vals.length,
      mean: ss.mean(vals),
      sd: vals.length > 1 ? ss.sampleStandardDeviation(vals) : 0,
    }))
    .sort((a, b) => b.n - a.n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Box plot (numeric × categorical)
// ─────────────────────────────────────────────────────────────────────────────

export type BoxplotGroup = {
  name: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
};

export type BoxplotResult = {
  outcome: string;
  group: string;
  groups: BoxplotGroup[];
};

export function boxplotFor(
  parsed: ParsedCsv,
  outcomeColumn: string,
  groupColumn: string
): BoxplotResult {
  const groups = collectGroups(parsed, outcomeColumn, groupColumn);
  const out: BoxplotGroup[] = [];
  for (const [g, vals] of groups) {
    if (vals.length === 0) continue;
    const q1 = ss.quantile(vals, 0.25);
    const q3 = ss.quantile(vals, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const inside = vals.filter((v) => v >= lower && v <= upper);
    const outliers = vals.filter((v) => v < lower || v > upper);
    out.push({
      name: g,
      n: vals.length,
      min: inside.length > 0 ? ss.min(inside) : ss.min(vals),
      max: inside.length > 0 ? ss.max(inside) : ss.max(vals),
      q1,
      median: ss.median(vals),
      q3,
      outliers,
    });
  }
  return { outcome: outcomeColumn, group: groupColumn, groups: out };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scatter plot (numeric × numeric, with embedded simple regression)
// ─────────────────────────────────────────────────────────────────────────────

export type ScatterResult = {
  xColumn: string;
  yColumn: string;
  n: number;
  points: { x: number; y: number }[];
  intercept: number;
  slope: number;
  r: number;
  r2: number;
};

export function scatterFor(
  parsed: ParsedCsv,
  xColumn: string,
  yColumn: string
): ScatterResult {
  const { x: xs, y: ys } = pairedNumericValues(parsed, xColumn, yColumn);
  const n = xs.length;
  const r = n >= 2 ? ss.sampleCorrelation(xs, ys) : 0;
  const mx = n > 0 ? ss.mean(xs) : 0;
  const my = n > 0 ? ss.mean(ys) : 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += Math.pow(xs[i] - mx, 2);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  return {
    xColumn,
    yColumn,
    n,
    points: xs.map((x, i) => ({ x, y: ys[i] })),
    intercept,
    slope,
    r,
    r2: r * r,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function fmt(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}
