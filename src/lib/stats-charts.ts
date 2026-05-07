// Hand-rolled SVG renderers for stats charts. Same templates power
// the on-screen editor and the DOCX export (where SVG is rasterised
// to PNG via @resvg/resvg-js).

import type {
  BoxplotResult,
  GroupMeansRow,
  HistogramBins,
  KaplanMeierResult,
  LogisticRegressionResult,
  RocResult,
  ScatterResult,
} from "@/lib/stats-engine";

const W = 720;
const H = 400;
const PAD_L = 60;
const PAD_R = 30;
const PAD_T = 50;
const PAD_B = 60;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function axesAndTitle(title: string, xLabel: string, yLabel: string): string {
  return `
    <text x="${W / 2}" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>
    <line x1="${PAD_L}" y1="${PAD_T + PLOT_H}" x2="${PAD_L + PLOT_W}" y2="${PAD_T + PLOT_H}" stroke="#475569" stroke-width="1"/>
    <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + PLOT_H}" stroke="#475569" stroke-width="1"/>
    <text x="${PAD_L + PLOT_W / 2}" y="${H - 14}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#374151">${escapeXml(xLabel)}</text>
    <text x="20" y="${PAD_T + PLOT_H / 2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#374151" transform="rotate(-90 20 ${PAD_T + PLOT_H / 2})">${escapeXml(yLabel)}</text>`;
}

function yTickLabels(min: number, max: number): string {
  const range = max - min || 1;
  return [0, 0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const v = min + frac * range;
      const y = PAD_T + (1 - frac) * PLOT_H;
      return `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(v)}</text><line x1="${PAD_L - 4}" y1="${y}" x2="${PAD_L}" y2="${y}" stroke="#475569" stroke-width="1"/>`;
    })
    .join("");
}

function svgWrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMin meet">${inner}</svg>`;
}

export function renderHistogramSvg(
  data: HistogramBins,
  options?: { title?: string; xLabel?: string; yLabel?: string }
): string {
  const title = options?.title ?? `Distribution of ${data.column}`;
  const xLabel = options?.xLabel ?? data.column;
  const yLabel = options?.yLabel ?? "Frequency";

  const maxCount = Math.max(1, ...data.bins.map((b) => b.count));
  const barW = data.bins.length > 0 ? PLOT_W / data.bins.length : 0;

  const bars = data.bins
    .map((b, i) => {
      const x = PAD_L + i * barW;
      const h = (b.count / maxCount) * PLOT_H;
      const y = PAD_T + (PLOT_H - h);
      return `<rect x="${x + 1}" y="${y}" width="${barW - 2}" height="${h}" fill="#3b82f6" stroke="#1e3a8a" stroke-width="0.5"/>${
        b.count > 0
          ? `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#1e3a8a">${b.count}</text>`
          : ""
      }`;
    })
    .join("");

  const ticks: string[] = [];
  for (let i = 0; i < data.bins.length; i += Math.max(1, Math.floor(data.bins.length / 6))) {
    const x = PAD_L + i * barW;
    ticks.push(
      `<text x="${x}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(data.bins[i].start)}</text>`
    );
  }
  if (data.bins.length > 0) {
    const last = data.bins[data.bins.length - 1];
    ticks.push(
      `<text x="${PAD_L + PLOT_W}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(last.end)}</text>`
    );
  }

  const yTicks = [0, Math.round(maxCount / 2), maxCount]
    .map((v) => {
      const y = PAD_T + PLOT_H - (v / maxCount) * PLOT_H;
      return `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${v}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(title, xLabel, yLabel)}
    ${bars}
    ${ticks.join("")}
    ${yTicks}
  `);
}

export function renderGroupMeansSvg(
  rows: GroupMeansRow[],
  options: { outcome: string; group: string; title?: string }
): string {
  const title = options.title ?? `${options.outcome} by ${options.group}`;
  const xLabel = options.group;
  const yLabel = `Mean ${options.outcome}`;

  const max = Math.max(0.01, ...rows.map((r) => r.mean + r.sd));
  const min = Math.min(0, ...rows.map((r) => r.mean - r.sd));
  const range = max - min || 1;
  const barW = rows.length > 0 ? PLOT_W / rows.length : 0;

  const bars = rows
    .map((r, i) => {
      const x = PAD_L + i * barW + barW * 0.18;
      const w = barW * 0.64;
      const top = PAD_T + ((max - r.mean) / range) * PLOT_H;
      const baseline = PAD_T + ((max - 0) / range) * PLOT_H;
      const h = Math.abs(baseline - top);
      const yRect = Math.min(top, baseline);
      const errTop = PAD_T + ((max - (r.mean + r.sd)) / range) * PLOT_H;
      const errBot = PAD_T + ((max - (r.mean - r.sd)) / range) * PLOT_H;
      const errX = x + w / 2;
      return `
        <rect x="${x}" y="${yRect}" width="${w}" height="${h}" fill="#10b981" stroke="#065f46" stroke-width="0.5"/>
        <text x="${x + w / 2}" y="${top - 8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="600" fill="#065f46">${fmt(r.mean)}</text>
        <line x1="${errX}" y1="${errTop}" x2="${errX}" y2="${errBot}" stroke="#065f46" stroke-width="1"/>
        <line x1="${errX - 6}" y1="${errTop}" x2="${errX + 6}" y2="${errTop}" stroke="#065f46" stroke-width="1"/>
        <line x1="${errX - 6}" y1="${errBot}" x2="${errX + 6}" y2="${errBot}" stroke="#065f46" stroke-width="1"/>
        <text x="${x + w / 2}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#374151">${escapeXml(r.group)}</text>
        <text x="${x + w / 2}" y="${PAD_T + PLOT_H + 30}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#6b7280">n = ${r.n}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(title, xLabel, yLabel)}
    ${bars}
    ${yTickLabels(min, max)}
  `);
}

export function renderBoxplotSvg(data: BoxplotResult, title?: string): string {
  const t = title ?? `${data.outcome} by ${data.group}`;
  const allValues: number[] = [];
  for (const g of data.groups) {
    allValues.push(g.min, g.max, ...g.outliers);
  }
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);
  const range = max - min || 1;
  const ySc = (v: number) => PAD_T + ((max - v) / range) * PLOT_H;
  const slot = data.groups.length > 0 ? PLOT_W / data.groups.length : 0;

  const boxes = data.groups
    .map((g, i) => {
      const cx = PAD_L + slot * (i + 0.5);
      const w = slot * 0.45;
      const left = cx - w / 2;
      const right = cx + w / 2;
      const yQ1 = ySc(g.q1);
      const yQ3 = ySc(g.q3);
      const yMed = ySc(g.median);
      const yMin = ySc(g.min);
      const yMax = ySc(g.max);
      const outliers = g.outliers
        .map(
          (v) =>
            `<circle cx="${cx}" cy="${ySc(v)}" r="2.5" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.5"/>`
        )
        .join("");
      return `
        <line x1="${cx}" y1="${yMin}" x2="${cx}" y2="${yMax}" stroke="#0f766e" stroke-width="1"/>
        <line x1="${left + 6}" y1="${yMin}" x2="${right - 6}" y2="${yMin}" stroke="#0f766e" stroke-width="1"/>
        <line x1="${left + 6}" y1="${yMax}" x2="${right - 6}" y2="${yMax}" stroke="#0f766e" stroke-width="1"/>
        <rect x="${left}" y="${Math.min(yQ1, yQ3)}" width="${w}" height="${Math.abs(yQ1 - yQ3)}" fill="#5eead4" stroke="#0f766e" stroke-width="1"/>
        <line x1="${left}" y1="${yMed}" x2="${right}" y2="${yMed}" stroke="#0f172a" stroke-width="2"/>
        ${outliers}
        <text x="${cx}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#374151">${escapeXml(g.name)}</text>
        <text x="${cx}" y="${PAD_T + PLOT_H + 30}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#6b7280">n = ${g.n}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(t, data.group, data.outcome)}
    ${boxes}
    ${yTickLabels(min, max)}
  `);
}

export function renderScatterSvg(
  data: { points: { x: number; y: number }[]; xColumn: string; yColumn: string; intercept?: number; slope?: number; r?: number },
  options?: { title?: string; showLine?: boolean }
): string {
  const showLine = options?.showLine ?? true;
  const title = options?.title ?? `${data.yColumn} vs. ${data.xColumn}${typeof data.r === "number" ? ` (r = ${fmt(data.r)})` : ""}`;
  if (data.points.length === 0) return svgWrap(axesAndTitle(title, data.xColumn, data.yColumn));
  const xs = data.points.map((p) => p.x);
  const ys = data.points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xSc = (v: number) => PAD_L + ((v - xMin) / xRange) * PLOT_W;
  const ySc = (v: number) => PAD_T + ((yMax - v) / yRange) * PLOT_H;

  const dots = data.points
    .map(
      (p) =>
        `<circle cx="${xSc(p.x)}" cy="${ySc(p.y)}" r="2.5" fill="#3b82f6" fill-opacity="0.7" stroke="#1e3a8a" stroke-width="0.4"/>`
    )
    .join("");

  let line = "";
  if (showLine && typeof data.slope === "number" && typeof data.intercept === "number") {
    const x1 = xMin;
    const x2 = xMax;
    const y1 = data.intercept + data.slope * x1;
    const y2 = data.intercept + data.slope * x2;
    line = `<line x1="${xSc(x1)}" y1="${ySc(y1)}" x2="${xSc(x2)}" y2="${ySc(y2)}" stroke="#dc2626" stroke-width="2"/>`;
  }

  // X tick labels
  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const v = xMin + frac * xRange;
      const x = PAD_L + frac * PLOT_W;
      return `<text x="${x}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(v)}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(title, data.xColumn, data.yColumn)}
    ${dots}
    ${line}
    ${yTickLabels(yMin, yMax)}
    ${xTicks}
  `);
}

export function renderRocSvg(roc: RocResult): string {
  const title = `ROC: ${roc.outcome} (positive = ${roc.positiveValue}) — AUC ${roc.auc.toFixed(3)}`;
  // Diagonal reference line
  const diag = `<line x1="${PAD_L}" y1="${PAD_T + PLOT_H}" x2="${PAD_L + PLOT_W}" y2="${PAD_T}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="4,3"/>`;
  const path = roc.points
    .map((p, i) => {
      const x = PAD_L + p.fpr * PLOT_W;
      const y = PAD_T + (1 - p.tpr) * PLOT_H;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const curve = `<path d="${path}" stroke="#dc2626" stroke-width="2" fill="none"/>`;

  // Optimal point
  let star = "";
  if (Number.isFinite(roc.optimal.threshold)) {
    const x = PAD_L + (1 - roc.optimal.spec) * PLOT_W;
    const y = PAD_T + (1 - roc.optimal.sens) * PLOT_H;
    star = `<circle cx="${x}" cy="${y}" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>`;
  }

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const x = PAD_L + frac * PLOT_W;
      return `<text x="${x}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${frac.toFixed(2)}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(title, "1 − Specificity", "Sensitivity")}
    ${diag}
    ${curve}
    ${star}
    ${yTickLabels(0, 1)}
    ${xTicks}
  `);
}

export function renderKaplanMeierSvg(km: KaplanMeierResult): string {
  const title = `Kaplan–Meier: ${km.timeColumn}`;
  const palette = ["#2563eb", "#dc2626", "#059669", "#9333ea", "#ea580c"];
  const tMax = Math.max(
    1,
    ...km.groups.flatMap((g) => g.points.map((p) => p.t))
  );

  const xSc = (t: number) => PAD_L + (t / tMax) * PLOT_W;
  const ySc = (s: number) => PAD_T + (1 - s) * PLOT_H;

  const curves = km.groups
    .map((g, gi) => {
      const color = palette[gi % palette.length];
      let d = "";
      let prev: { t: number; s: number } | null = null;
      for (const p of g.points) {
        if (!prev) {
          d += `M ${xSc(p.t)} ${ySc(p.s)} `;
        } else {
          // step function: horizontal then vertical
          d += `L ${xSc(p.t)} ${ySc(prev.s)} L ${xSc(p.t)} ${ySc(p.s)} `;
        }
        prev = p;
      }
      return `<path d="${d}" stroke="${color}" stroke-width="2" fill="none"/>
        <text x="${PAD_L + PLOT_W - 10}" y="${PAD_T + 16 + gi * 14}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="${color}" font-weight="600">${escapeXml(g.name)} (n=${g.n})</text>`;
    })
    .join("");

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const v = frac * tMax;
      const x = PAD_L + frac * PLOT_W;
      return `<text x="${x}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(v)}</text>`;
    })
    .join("");

  let logRankLabel = "";
  if (km.logRank) {
    const p = km.logRank.pValue < 0.001 ? "< 0.001" : km.logRank.pValue.toFixed(3);
    logRankLabel = `<text x="${PAD_L + 10}" y="${PAD_T + 16}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#0f172a" font-weight="600">Log-rank χ² = ${km.logRank.chi2.toFixed(2)}, p = ${p}</text>`;
  }

  return svgWrap(`
    ${axesAndTitle(title, km.timeColumn, "Survival probability")}
    ${curves}
    ${yTickLabels(0, 1)}
    ${xTicks}
    ${logRankLabel}
  `);
}

export function renderLogisticCurveSvg(lr: LogisticRegressionResult): string {
  const title = `${lr.outcome} (positive = ${lr.positiveValue}) vs. ${lr.predictor}`;
  const xs = lr.curve.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xRange = xMax - xMin || 1;
  const xSc = (v: number) => PAD_L + ((v - xMin) / xRange) * PLOT_W;
  const ySc = (p: number) => PAD_T + (1 - p) * PLOT_H;

  // Data points (jittered y for visibility)
  const dots = lr.points
    .map(
      (p) =>
        `<circle cx="${xSc(p.x)}" cy="${ySc(p.y === 1 ? 0.97 : 0.03)}" r="2.5" fill="${p.y === 1 ? "#dc2626" : "#2563eb"}" fill-opacity="0.6"/>`
    )
    .join("");

  // Curve
  const path = lr.curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xSc(p.x)} ${ySc(p.p)}`)
    .join(" ");
  const curve = `<path d="${path}" stroke="#0f172a" stroke-width="2" fill="none"/>`;

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const v = xMin + frac * xRange;
      const x = PAD_L + frac * PLOT_W;
      return `<text x="${x}" y="${PAD_T + PLOT_H + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(v)}</text>`;
    })
    .join("");

  return svgWrap(`
    ${axesAndTitle(title, lr.predictor, "P(outcome = positive)")}
    ${dots}
    ${curve}
    ${yTickLabels(0, 1)}
    ${xTicks}
  `);
}

// Convenience wrapper for plain ScatterResult
export function renderScatterFromResult(
  s: ScatterResult,
  showLine = true
): string {
  return renderScatterSvg(s, { showLine });
}

/**
 * Convert SVG to PNG using resvg (WASM, works on Vercel serverless).
 */
export async function svgToPng(svg: string, widthPx = 900): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: widthPx },
    background: "white",
  });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}
