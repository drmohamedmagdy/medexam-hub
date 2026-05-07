"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUseResearch, upgradeRequiredError } from "@/lib/research-access";
import {
  preflightStatsAnalysis,
  recordStatsAnalysisRun,
} from "@/lib/research-quota";
import {
  dispatchAnalysis,
  isAnalysisKind,
  parseCsv,
  parseDispatchInput,
} from "@/lib/stats-dispatch";
import type { ParsedCsv } from "@/lib/stats-engine";

export type AnalysisKind = string;
export type AnalysisState =
  | { ok?: boolean; error?: string; analysisId?: string }
  | null;

async function loadCsv(
  fileId: string,
  userId: string
): Promise<{ parsed: ParsedCsv; filename: string } | null> {
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
    return { ok: false, error: upgradeRequiredError() };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!projectId || !fileId) return { ok: false, error: "Missing project or file id." };
  if (!isAnalysisKind(kind)) return { ok: false, error: "Unsupported analysis kind." };

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "Project not found." };
  }

  const csv = await loadCsv(fileId, user.id);
  if (!csv) return { ok: false, error: "File not found." };
  if (csv.parsed.columns.length === 0) {
    return { ok: false, error: "Couldn't parse this file as a CSV. Check the format." };
  }

  // Researcher plan: enforce monthly stats analyses quota. Premium has no
  // quota for stats (free, local computation).
  const quotaError = await preflightStatsAnalysis(user.id, user.plan);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    const input = parseDispatchInput(formData);
    const out = dispatchAnalysis(csv.parsed, input);
    const config: Record<string, unknown> = {
      ...out.config,
      fileId,
      filename: csv.filename,
    };
    const created = await prisma.researchAnalysis.create({
      data: {
        projectId,
        fileId,
        kind: input.kind,
        title: out.title,
        configJson: JSON.stringify(config),
        resultJson: JSON.stringify(out.resultJson),
        resultSvg: out.resultSvg,
        computedAt: new Date(),
      },
    });
    // Drain bonus pool if this analysis pushed the user past their cap.
    await recordStatsAnalysisRun(user.id, user.plan);
    revalidatePath(`/research/${projectId}`);
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
