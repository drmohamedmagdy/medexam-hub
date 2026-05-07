"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractText, MAX_FILE_BYTES } from "@/lib/file-upload";
import {
  parseCsv,
  descriptivesFor,
  tTestBetween,
  correlationMatrix,
  histogramFor,
  groupMeansFor,
  type ParsedCsv,
} from "@/lib/stats-engine";
import { renderHistogramSvg, renderGroupMeansSvg } from "@/lib/stats-charts";

export type StatsState = { ok?: boolean; error?: string } | null;
export type StatsAnalysisState =
  | { ok?: boolean; error?: string; analysisId?: string }
  | null;

async function getOrCreateWorkspace(userId: string) {
  const existing = await prisma.statsWorkspace.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.statsWorkspace.create({ data: { userId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Replace the workspace's file (deletes prior file blob + analyses)
// ─────────────────────────────────────────────────────────────────────────────

const ReplaceSchema = z.object({
  fileUrl: z.string().url(),
  filePathname: z.string().min(1).max(500),
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(1).max(MAX_FILE_BYTES),
});

export async function replaceStatsFileAction(
  _prev: StatsState,
  formData: FormData
): Promise<StatsState> {
  const user = await requireUser();

  const parsed = ReplaceSchema.safeParse({
    fileUrl: formData.get("fileUrl"),
    filePathname: formData.get("filePathname"),
    filename: formData.get("filename"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  });
  if (!parsed.success) return { error: "Invalid upload metadata." };

  let buffer: Buffer;
  try {
    const res = await fetch(parsed.data.fileUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return {
      error: `Couldn't read the uploaded file: ${
        e instanceof Error ? e.message : "unknown"
      }`,
    };
  }

  let extractedText = "";
  let charCount = 0;
  try {
    const result = await extractText(
      buffer,
      parsed.data.mimeType,
      parsed.data.filename
    );
    extractedText = result.text;
    charCount = result.charCount;
  } catch (e) {
    return {
      error: `Couldn't extract text: ${
        e instanceof Error ? e.message : "unsupported format"
      }`,
    };
  }

  const ws = await getOrCreateWorkspace(user.id);

  // Delete the previously-stored blob (best effort) and clear all analyses,
  // since the columns most likely changed.
  if (ws.filePathname) {
    void del(ws.filePathname).catch(() => {});
  }
  await prisma.statsAnalysis.deleteMany({ where: { workspaceId: ws.id } });

  await prisma.statsWorkspace.update({
    where: { id: ws.id },
    data: {
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      charCount,
      extractedText,
      fileUrl: parsed.data.fileUrl,
      filePathname: parsed.data.filePathname,
      uploadedAt: new Date(),
    },
  });

  revalidatePath("/statistics");
  return { ok: true };
}

export async function clearStatsFileAction(): Promise<void> {
  const user = await requireUser();
  const ws = await prisma.statsWorkspace.findUnique({ where: { userId: user.id } });
  if (!ws) return;
  if (ws.filePathname) void del(ws.filePathname).catch(() => {});
  await prisma.statsAnalysis.deleteMany({ where: { workspaceId: ws.id } });
  await prisma.statsWorkspace.update({
    where: { id: ws.id },
    data: {
      filename: null,
      mimeType: null,
      sizeBytes: null,
      charCount: null,
      extractedText: null,
      fileUrl: null,
      filePathname: null,
      uploadedAt: null,
    },
  });
  revalidatePath("/statistics");
}

// ─────────────────────────────────────────────────────────────────────────────
// Add an analysis to the workspace (mirrors the project version, but
// targets StatsWorkspace + StatsAnalysis instead of ResearchProject /
// ResearchAnalysis).
// ─────────────────────────────────────────────────────────────────────────────

const AddSchema = z.object({
  kind: z.enum(["descriptives", "compare_means", "correlation", "histogram"]),
  title: z.string().max(200).optional(),
  outcomeColumn: z.string().max(200).optional(),
  groupColumn: z.string().max(200).optional(),
  histogramColumn: z.string().max(200).optional(),
  histogramBins: z.coerce.number().int().min(3).max(50).optional(),
  columns: z.string().max(2000).optional(),
});

export async function addStatsAnalysisAction(
  _prev: StatsAnalysisState,
  formData: FormData
): Promise<StatsAnalysisState> {
  const user = await requireUser();

  const parsed = AddSchema.safeParse({
    kind: formData.get("kind"),
    title: String(formData.get("title") ?? "").trim() || undefined,
    outcomeColumn: String(formData.get("outcomeColumn") ?? "").trim() || undefined,
    groupColumn: String(formData.get("groupColumn") ?? "").trim() || undefined,
    histogramColumn: String(formData.get("histogramColumn") ?? "").trim() || undefined,
    histogramBins: formData.get("histogramBins"),
    columns: String(formData.get("columns") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ws = await prisma.statsWorkspace.findUnique({ where: { userId: user.id } });
  if (!ws || !ws.extractedText) {
    return { ok: false, error: "Upload a CSV first." };
  }

  const csv: ParsedCsv = parseCsv(ws.extractedText);
  if (csv.columns.length === 0) {
    return { ok: false, error: "Couldn't parse this file as a CSV." };
  }

  let resultJson: unknown;
  let resultSvg: string | null = null;
  let title: string;

  try {
    const config: Record<string, unknown> = {
      filename: ws.filename ?? null,
    };

    switch (parsed.data.kind) {
      case "descriptives": {
        const cols = parsed.data.columns
          ? parsed.data.columns.split(",").map((c) => c.trim()).filter(Boolean)
          : csv.numericColumns;
        if (cols.length === 0) {
          return { ok: false, error: "No numeric columns detected." };
        }
        config.columns = cols;
        resultJson = descriptivesFor(csv, cols);
        title = parsed.data.title ?? `Descriptive statistics`;
        break;
      }
      case "compare_means": {
        if (!parsed.data.outcomeColumn || !parsed.data.groupColumn) {
          return { ok: false, error: "Pick an outcome column and a grouping column." };
        }
        config.outcomeColumn = parsed.data.outcomeColumn;
        config.groupColumn = parsed.data.groupColumn;
        const tt = tTestBetween(csv, parsed.data.outcomeColumn, parsed.data.groupColumn);
        const groupMeans = groupMeansFor(
          csv,
          parsed.data.outcomeColumn,
          parsed.data.groupColumn
        );
        resultJson = { tTest: tt, groupMeans };
        resultSvg = renderGroupMeansSvg(groupMeans, {
          outcome: parsed.data.outcomeColumn,
          group: parsed.data.groupColumn,
        });
        title =
          parsed.data.title ??
          `${parsed.data.outcomeColumn} by ${parsed.data.groupColumn} (t-test)`;
        break;
      }
      case "correlation": {
        const cols = parsed.data.columns
          ? parsed.data.columns.split(",").map((c) => c.trim()).filter(Boolean)
          : csv.numericColumns;
        if (cols.length < 2) {
          return { ok: false, error: "Pick at least two numeric columns." };
        }
        config.columns = cols;
        resultJson = correlationMatrix(csv, cols);
        title = parsed.data.title ?? `Correlation matrix`;
        break;
      }
      case "histogram": {
        if (!parsed.data.histogramColumn) {
          return { ok: false, error: "Pick a column." };
        }
        const numBins = parsed.data.histogramBins ?? 12;
        config.column = parsed.data.histogramColumn;
        config.bins = numBins;
        const hist = histogramFor(csv, parsed.data.histogramColumn, numBins);
        resultJson = hist;
        resultSvg = renderHistogramSvg(hist);
        title = parsed.data.title ?? `Distribution of ${parsed.data.histogramColumn}`;
        break;
      }
      default:
        return { ok: false, error: "Unsupported analysis kind." };
    }

    const created = await prisma.statsAnalysis.create({
      data: {
        workspaceId: ws.id,
        kind: parsed.data.kind,
        title,
        configJson: JSON.stringify(config),
        resultJson: JSON.stringify(resultJson),
        resultSvg,
        computedAt: new Date(),
      },
    });

    revalidatePath("/statistics");
    return { ok: true, analysisId: created.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't compute the analysis.",
    };
  }
}

export async function deleteStatsAnalysisAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const a = await prisma.statsAnalysis.findUnique({
    where: { id },
    include: { workspace: { select: { userId: true } } },
  });
  if (!a || a.workspace.userId !== user.id) return;
  await prisma.statsAnalysis.delete({ where: { id } });
  revalidatePath("/statistics");
}
