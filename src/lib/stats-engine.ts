import * as ss from "simple-statistics";

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing — minimal, RFC-4180-ish (handles quoted fields with commas).
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedCsv = {
  columns: string[];
  rows: string[][];
  numericColumns: string[];
  categoricalColumns: string[];
};

export function parseCsv(text: string): ParsedCsv {
  // Detect delimiter: tab if file has more tabs than commas, else comma.
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
    return { columns: [], rows: [], numericColumns: [], categoricalColumns: [] };
  }
  const columns = filtered[0].map((c, i) => (c.trim() || `col_${i + 1}`));
  const rows = filtered.slice(1);

  // Classify each column: numeric if at least 60% of non-empty cells parse to a number.
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  for (let ci = 0; ci < columns.length; ci++) {
    let nonEmpty = 0;
    let numeric = 0;
    for (const r of rows) {
      const v = (r[ci] ?? "").trim();
      if (v === "") continue;
      nonEmpty++;
      if (Number.isFinite(Number(v))) numeric++;
    }
    if (nonEmpty > 0 && numeric / nonEmpty >= 0.6) numericColumns.push(columns[ci]);
    else categoricalColumns.push(columns[ci]);
  }

  return { columns, rows, numericColumns, categoricalColumns };
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

function categoricalValues(parsed: ParsedCsv, columnName: string): string[] {
  const idx = columnIndex(parsed, columnName);
  return parsed.rows.map((r) => (r[idx] ?? "").trim()).filter((v) => v.length > 0);
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
      sd: ss.sampleStandardDeviation(values),
      min: ss.min(values),
      max: ss.max(values),
      q1: ss.quantile(values, 0.25),
      q3: ss.quantile(values, 0.75),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Welch's t-test for two independent groups — robust against unequal variances
// ─────────────────────────────────────────────────────────────────────────────

export type TTestResult = {
  group1: { name: string; n: number; mean: number; sd: number };
  group2: { name: string; n: number; mean: number; sd: number };
  meanDifference: number;
  t: number;
  df: number;
  pValue: number;
};

function tDistTwoTailed(t: number, df: number): number {
  // Approximate two-sided p-value using a series approximation. Accurate
  // enough for reporting; not a substitute for a real stats package.
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  // regularized incomplete beta — implemented via continued fraction.
  function regIncBeta(x: number, a: number, b: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;
    const lbeta =
      lnGamma(a) + lnGamma(b) - lnGamma(a + b) -
      a * Math.log(x) - b * Math.log(1 - x);
    let cf = 1;
    let prev = 1;
    let m = 0;
    for (let i = 1; i < 200; i++) {
      m = i;
      const num1 = -((a + m - 1) * (a + b + m - 1) * x) / ((a + 2 * m - 2) * (a + 2 * m - 1));
      const num2 = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
      cf = 1 + num1 / cf;
      cf = 1 + num2 / cf;
      if (Math.abs(cf - prev) < 1e-10) break;
      prev = cf;
    }
    const front = Math.exp(-lbeta) / a;
    return front / cf;
  }
  function lnGamma(z: number): number {
    // Lanczos approximation
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    }
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const p = regIncBeta(x, a, b);
  return Math.max(0, Math.min(1, p));
}

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
      `Need at least 2 distinct groups in "${groupColumn}" to run a t-test (found ${groupNames.length}).`
    );
  }
  // Use the two largest groups if there are more than two.
  const sorted = groupNames
    .map((n) => ({ n, vals: groups.get(n)! }))
    .sort((a, b) => b.vals.length - a.vals.length);
  const [a, b] = sorted;

  const m1 = ss.mean(a.vals);
  const m2 = ss.mean(b.vals);
  const s1 = ss.sampleStandardDeviation(a.vals);
  const s2 = ss.sampleStandardDeviation(b.vals);
  const n1 = a.vals.length;
  const n2 = b.vals.length;

  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  const t = (m1 - m2) / se;
  // Welch–Satterthwaite df
  const num = Math.pow((s1 * s1) / n1 + (s2 * s2) / n2, 2);
  const den =
    Math.pow((s1 * s1) / n1, 2) / (n1 - 1) +
    Math.pow((s2 * s2) / n2, 2) / (n2 - 1);
  const df = num / den;

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

  // Pair-wise complete obs (drop rows where either column is missing).
  for (let i = 0; i < cols.length; i++) {
    for (let j = 0; j < cols.length; j++) {
      const a = columnIndex(parsed, cols[i]);
      const b = columnIndex(parsed, cols[j]);
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of parsed.rows) {
        const va = (r[a] ?? "").trim();
        const vb = (r[b] ?? "").trim();
        if (va === "" || vb === "") continue;
        const na = Number(va);
        const nb = Number(vb);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) continue;
        xs.push(na);
        ys.push(nb);
      }
      const r = xs.length >= 2 ? ss.sampleCorrelation(xs, ys) : NaN;
      cells.push({ rowColumn: cols[i], colColumn: cols[j], r, n: xs.length });
    }
  }

  return { columns: cols, cells };
}

// ─────────────────────────────────────────────────────────────────────────────
// Histogram bins
// ─────────────────────────────────────────────────────────────────────────────

export type HistogramBins = {
  column: string;
  bins: Array<{ start: number; end: number; count: number }>;
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
  return Array.from(groups.entries())
    .map(([group, vals]) => ({
      group,
      n: vals.length,
      mean: ss.mean(vals),
      sd: vals.length > 1 ? ss.sampleStandardDeviation(vals) : 0,
    }))
    .sort((a, b) => b.n - a.n);
}

// Use these helpers to format numbers consistently for display + DOCX.
export function fmt(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}
