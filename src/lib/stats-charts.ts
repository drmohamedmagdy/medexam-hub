// Hand-rolled SVG renderers for stats charts. Same templates power
// the on-screen editor and the DOCX export (where SVG is rasterised
// to PNG via @resvg/resvg-js).

import type { GroupMeansRow, HistogramBins } from "@/lib/stats-engine";

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

  // X tick labels: every other bin start, plus the final end.
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

  // Y tick labels: 0, max/2, max
  const yTicks = [0, Math.round(maxCount / 2), maxCount].map((v) => {
    const y = PAD_T + PLOT_H - (v / maxCount) * PLOT_H;
    return `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${v}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMin meet">
    ${axesAndTitle(title, xLabel, yLabel)}
    ${bars}
    ${ticks.join("")}
    ${yTicks}
  </svg>`;
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

  // Y tick labels — 5 evenly spaced
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const v = min + frac * range;
    const y = PAD_T + ((max - v) / range) * PLOT_H;
    return `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#475569">${fmt(v)}</text><line x1="${PAD_L - 4}" y1="${y}" x2="${PAD_L}" y2="${y}" stroke="#475569" stroke-width="1"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMin meet">
    ${axesAndTitle(title, xLabel, yLabel)}
    ${bars}
    ${yTicks}
  </svg>`;
}

/**
 * Convert SVG to PNG using resvg (WASM, works on Vercel serverless).
 * Used by the DOCX exporter to embed charts as images.
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
