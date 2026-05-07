"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUseResearch } from "@/lib/research-access";
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

export type AnalysisKind =
  | "descriptives"
  | "compare_means"
  | "correlation"
  | "histogram";

export type AnalysisState = { ok?: boolean; error?: string; analysisId?: string } | null;

const AddSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  kind: z.enum(["descriptives", "compare_means", "correlation", "histogram"]),
  title: z.string().max(200).optional(),
  // Kind-specific config (parsed below).
  outcomeColumn: z.string().max(200).optional(),
  groupColumn: z.string().max(200).optional(),
  histogramColumn: z.string().max(200).optional(),
  histogramBins: z.coerce.number().int().min(3).max(50).optional(),
  // Multi-column selectors are passed as comma-separated strings.
  columns: z.string().max(2000).optional(),
});

async function loadCsv(fileId: string, userId: string): Promise<{
  parsed: ParsedCsv;
  filename: string;
} | null> {
  const file = await prisma.researchFile.findUnique({
    where: { id: fileId },
    include: { project: { select: { userId: true } } },
  });
  if (!file || file.project.userId !== userId) return null;
  const parsed = parseCsv(file.extractedText);
  return { parsed, filename: file.filename };
}

export async function addAnalysisAction(
  _prev: AnalysisState,
  formData: FormData
): Promise<AnalysisState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return { ok: false, error: "Available on Pro and Premium plans." };
  }

  const parsed = AddSchema.safeParse({
    projectId: formData.get("projectId"),
    fileId: formData.get("fileId"),
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

  const project = await prisma.researchProject.findUnique({
    where: { id: parsed.data.projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "Project not found." };
  }

  const csv = await loadCsv(parsed.data.fileId, user.id);
  if (!csv) return { ok: false, error: "File not found." };
  if (csv.parsed.columns.length === 0) {
    return { ok: false, error: "Couldn't parse this file as a CSV. Check the format." };
  }

  let resultJson: unknown;
  let resultSvg: string | null = null;
  let title: string;

  try {
    const config: Record<string, unknown> = {
      fileId: parsed.data.fileId,
      filename: csv.filename,
    };

    switch (parsed.data.kind) {
      case "descriptives": {
        const cols = parsed.data.columns
          ? parsed.data.columns
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : csv.parsed.numericColumns;
        if (cols.length === 0) {
          return { ok: false, error: "No numeric columns detected. Check the file." };
        }
        config.columns = cols;
        resultJson = descriptivesFor(csv.parsed, cols);
        title = parsed.data.title ?? `Descriptive statistics — ${csv.filename}`;
        break;
      }
      case "compare_means": {
        if (!parsed.data.outcomeColumn || !parsed.data.groupColumn) {
          return { ok: false, error: "Pick an outcome column and a grouping column." };
        }
        config.outcomeColumn = parsed.data.outcomeColumn;
        config.groupColumn = parsed.data.groupColumn;
        const tt = tTestBetween(
          csv.parsed,
          parsed.data.outcomeColumn,
          parsed.data.groupColumn
        );
        const groupMeans = groupMeansFor(
          csv.parsed,
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
          ? parsed.data.columns
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : csv.parsed.numericColumns;
        if (cols.length < 2) {
          return { ok: false, error: "Pick at least two numeric columns." };
        }
        config.columns = cols;
        resultJson = correlationMatrix(csv.parsed, cols);
        title = parsed.data.title ?? `Correlation matrix — ${cols.length} variables`;
        break;
      }
      case "histogram": {
        if (!parsed.data.histogramColumn) {
          return { ok: false, error: "Pick a column." };
        }
        const numBins = parsed.data.histogramBins ?? 12;
        config.column = parsed.data.histogramColumn;
        config.bins = numBins;
        const hist = histogramFor(csv.parsed, parsed.data.histogramColumn, numBins);
        resultJson = hist;
        resultSvg = renderHistogramSvg(hist);
        title = parsed.data.title ?? `Distribution of ${parsed.data.histogramColumn}`;
        break;
      }
      default: {
        return { ok: false, error: "Unsupported analysis kind." };
      }
    }

    const created = await prisma.researchAnalysis.create({
      data: {
        projectId: parsed.data.projectId,
        fileId: parsed.data.fileId,
        kind: parsed.data.kind,
        title,
        configJson: JSON.stringify(config),
        resultJson: JSON.stringify(resultJson),
        resultSvg,
        computedAt: new Date(),
      },
    });

    revalidatePath(`/research/${parsed.data.projectId}`);
    return { ok: true, analysisId: created.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't compute the analysis.",
    };
  }
}

export async function deleteAnalysisAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const a = await prisma.researchAnalysis.findUnique({
    where: { id },
    include: { project: { select: { userId: true } } },
  });
  if (!a || a.project.userId !== user.id) return;
  await prisma.researchAnalysis.delete({ where: { id } });
  revalidatePath(`/research/${a.projectId}`);
}
