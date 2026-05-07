// PRISMA 2020 flow diagram — generates an SVG string from a structured
// data object. Used both by the on-screen editor and the DOCX export.
//
// We hand-render the SVG instead of reaching for a heavy diagramming
// library because (a) the structure is fixed, (b) we want consistent
// output across web + Word, and (c) it keeps the bundle small.

export type PrismaFlowData = {
  identifiedDatabases: number;
  identifiedRegisters: number;
  identifiedOtherSources: number;
  duplicatesRemoved: number;
  recordsScreened: number;
  recordsExcluded: number;
  reportsSought: number;
  reportsNotRetrieved: number;
  reportsAssessed: number;
  reportsExcluded: number;
  reasonsExcluded: string[];
  studiesIncluded: number;
  reportsIncluded: number;
};

export function safeParsePrismaFlow(json: string | null | undefined): PrismaFlowData | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const num = (k: string) => (typeof o[k] === "number" ? (o[k] as number) : 0);
    const arr = (k: string) =>
      Array.isArray(o[k]) ? (o[k] as unknown[]).map((x) => String(x)) : [];
    return {
      identifiedDatabases: num("identifiedDatabases"),
      identifiedRegisters: num("identifiedRegisters"),
      identifiedOtherSources: num("identifiedOtherSources"),
      duplicatesRemoved: num("duplicatesRemoved"),
      recordsScreened: num("recordsScreened"),
      recordsExcluded: num("recordsExcluded"),
      reportsSought: num("reportsSought"),
      reportsNotRetrieved: num("reportsNotRetrieved"),
      reportsAssessed: num("reportsAssessed"),
      reportsExcluded: num("reportsExcluded"),
      reasonsExcluded: arr("reasonsExcluded"),
      studiesIncluded: num("studiesIncluded"),
      reportsIncluded: num("reportsIncluded"),
    };
  } catch {
    return null;
  }
}

const W = 760;
const H = 920;
const BOX_W = 280;
const BOX_H = 70;
const COL_X = (W - BOX_W) / 2;
const SIDE_W = 200;
const SIDE_X = COL_X + BOX_W + 30;

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string,
  fill = "#dbeafe",
  stroke = "#1e40af"
): string {
  // Simple multi-line text wrapping for the body (max ~38 chars/line).
  const lines = wrapLines(body, 38, 3);
  const titleY = y + 18;
  const bodyStartY = titleY + 18;
  const bodyTspans = lines
    .map(
      (line, i) =>
        `<tspan x="${x + 12}" dy="${i === 0 ? 0 : 14}">${escapeXml(line)}</tspan>`
    )
    .join("");
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${x + 12}" y="${titleY}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#1e3a8a">${escapeXml(title)}</text>
      <text x="${x + 12}" y="${bodyStartY}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#1f2937">${bodyTspans}</text>
    </g>`;
}

function arrow(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow)"/>`;
}

function wrapLines(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxChars) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.length > lines.join(" ").split(/\s+/).length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxChars - 1) + "…";
  }
  return lines;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderPrismaSvg(data: PrismaFlowData): string {
  const reasonsLine = data.reasonsExcluded
    .slice(0, 3)
    .map((r) => `• ${r}`)
    .join("  ");

  // Y positions for each row of boxes.
  const Y_IDENT = 70;
  const Y_DEDUP = Y_IDENT + 110;
  const Y_SCREEN = Y_DEDUP + 110;
  const Y_SOUGHT = Y_SCREEN + 110;
  const Y_ASSESS = Y_SOUGHT + 110;
  const Y_INCL = Y_ASSESS + 130;

  const idText = `Databases: ${data.identifiedDatabases}\nRegisters: ${data.identifiedRegisters}\nOther sources: ${data.identifiedOtherSources}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMin meet">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#475569"/>
      </marker>
    </defs>
    <text x="${W / 2}" y="30" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">PRISMA 2020 Flow Diagram</text>

    <!-- Identification -->
    <text x="20" y="${Y_IDENT + 20}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#7c2d12" transform="rotate(-90 20 ${Y_IDENT + 20})">IDENTIFICATION</text>
    ${box(COL_X, Y_IDENT, BOX_W, BOX_H, "Records identified from:", idText, "#fef3c7", "#92400e")}

    <!-- Dedup -->
    ${arrow(COL_X + BOX_W / 2, Y_IDENT + BOX_H, COL_X + BOX_W / 2, Y_DEDUP)}
    ${box(COL_X, Y_DEDUP, BOX_W, BOX_H, "Records after duplicates removed", `Duplicates removed: ${data.duplicatesRemoved}`, "#dbeafe", "#1e40af")}

    <!-- Screening -->
    <text x="20" y="${Y_SCREEN + 20}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#1e3a8a" transform="rotate(-90 20 ${Y_SCREEN + 20})">SCREENING</text>
    ${arrow(COL_X + BOX_W / 2, Y_DEDUP + BOX_H, COL_X + BOX_W / 2, Y_SCREEN)}
    ${box(COL_X, Y_SCREEN, BOX_W, BOX_H, "Records screened", `n = ${data.recordsScreened}`, "#dbeafe", "#1e40af")}
    ${box(SIDE_X, Y_SCREEN, SIDE_W, BOX_H, "Records excluded", `n = ${data.recordsExcluded}`, "#fee2e2", "#991b1b")}
    ${arrow(COL_X + BOX_W, Y_SCREEN + BOX_H / 2, SIDE_X, Y_SCREEN + BOX_H / 2)}

    <!-- Reports sought -->
    ${arrow(COL_X + BOX_W / 2, Y_SCREEN + BOX_H, COL_X + BOX_W / 2, Y_SOUGHT)}
    ${box(COL_X, Y_SOUGHT, BOX_W, BOX_H, "Reports sought for retrieval", `n = ${data.reportsSought}`, "#dbeafe", "#1e40af")}
    ${box(SIDE_X, Y_SOUGHT, SIDE_W, BOX_H, "Reports not retrieved", `n = ${data.reportsNotRetrieved}`, "#fee2e2", "#991b1b")}
    ${arrow(COL_X + BOX_W, Y_SOUGHT + BOX_H / 2, SIDE_X, Y_SOUGHT + BOX_H / 2)}

    <!-- Assessed for eligibility -->
    ${arrow(COL_X + BOX_W / 2, Y_SOUGHT + BOX_H, COL_X + BOX_W / 2, Y_ASSESS)}
    ${box(COL_X, Y_ASSESS, BOX_W, BOX_H + 30, "Reports assessed for eligibility", `n = ${data.reportsAssessed}`, "#dbeafe", "#1e40af")}
    ${box(
      SIDE_X,
      Y_ASSESS,
      SIDE_W,
      BOX_H + 30,
      `Reports excluded (n = ${data.reportsExcluded})`,
      reasonsLine || "Reasons not specified",
      "#fee2e2",
      "#991b1b"
    )}
    ${arrow(COL_X + BOX_W, Y_ASSESS + (BOX_H + 30) / 2, SIDE_X, Y_ASSESS + (BOX_H + 30) / 2)}

    <!-- Included -->
    <text x="20" y="${Y_INCL + 20}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#065f46" transform="rotate(-90 20 ${Y_INCL + 20})">INCLUDED</text>
    ${arrow(COL_X + BOX_W / 2, Y_ASSESS + BOX_H + 30, COL_X + BOX_W / 2, Y_INCL)}
    ${box(
      COL_X,
      Y_INCL,
      BOX_W,
      BOX_H + 20,
      "Studies included in review",
      `Studies: ${data.studiesIncluded}\nReports of included studies: ${data.reportsIncluded}`,
      "#d1fae5",
      "#065f46"
    )}
  </svg>`;
}

export function renderPrismaTextSummary(data: PrismaFlowData): string {
  return [
    "PRISMA 2020 Flow Summary",
    "",
    `Identification:`,
    `  - Records from databases: ${data.identifiedDatabases}`,
    `  - Records from registers: ${data.identifiedRegisters}`,
    `  - Records from other sources: ${data.identifiedOtherSources}`,
    `  - Duplicates removed: ${data.duplicatesRemoved}`,
    "",
    `Screening:`,
    `  - Records screened: ${data.recordsScreened}`,
    `  - Records excluded: ${data.recordsExcluded}`,
    "",
    `Retrieval:`,
    `  - Reports sought: ${data.reportsSought}`,
    `  - Reports not retrieved: ${data.reportsNotRetrieved}`,
    "",
    `Eligibility:`,
    `  - Reports assessed: ${data.reportsAssessed}`,
    `  - Reports excluded: ${data.reportsExcluded}`,
    ...(data.reasonsExcluded.length > 0
      ? [`  - Reasons:`, ...data.reasonsExcluded.map((r) => `    • ${r}`)]
      : []),
    "",
    `Included:`,
    `  - Studies in review: ${data.studiesIncluded}`,
    `  - Reports of included studies: ${data.reportsIncluded}`,
  ].join("\n");
}
