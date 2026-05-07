"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { canUseResearch, upgradeRequiredError } from "@/lib/research-access";
import {
  preflightStatsAnalysis,
  recordStatsAnalysisRun,
} from "@/lib/research-quota";
import { prisma } from "@/lib/db";
import { extractText, MAX_FILE_BYTES } from "@/lib/file-upload";
import {
  dispatchAnalysis,
  isAnalysisKind,
  parseCsv,
  parseDispatchInput,
} from "@/lib/stats-dispatch";

export type StatsState = { ok?: boolean; error?: string; fileId?: string } | null;
export type StatsAnalysisState =
  | { ok?: boolean; error?: string; analysisId?: string }
  | null;

async function getOrCreateWorkspace(userId: string) {
  const existing = await prisma.statsWorkspace.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.statsWorkspace.create({ data: { userId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Add a file to the workspace. The workspace can hold any number of files —
// each analysis is then tagged with which file it ran on.
// ─────────────────────────────────────────────────────────────────────────────

const AttachSchema = z.object({
  fileUrl: z.string().url(),
  filePathname: z.string().min(1).max(500),
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(1).max(MAX_FILE_BYTES),
});

export async function addStatsFileAction(
  _prev: StatsState,
  formData: FormData
): Promise<StatsState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return { error: upgradeRequiredError() };
  }

  const parsed = AttachSchema.safeParse({
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
    const result = await extractText(buffer, parsed.data.mimeType, parsed.data.filename);
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

  const created = await prisma.statsFile.create({
    data: {
      workspaceId: ws.id,
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      charCount,
      extractedText,
      fileUrl: parsed.data.fileUrl,
      filePathname: parsed.data.filePathname,
    },
  });

  revalidatePath("/statistics");
  return { ok: true, fileId: created.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove a single file. Analyses that referenced it have their fileId set to
// NULL by the schema-level ON DELETE SET NULL, so result rows survive.
// ─────────────────────────────────────────────────────────────────────────────

export async function removeStatsFileAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const file = await prisma.statsFile.findUnique({
    where: { id },
    include: { workspace: { select: { userId: true } } },
  });
  if (!file || file.workspace.userId !== user.id) return;
  if (file.filePathname) {
    void del(file.filePathname).catch(() => {});
  }
  await prisma.statsFile.delete({ where: { id } });
  revalidatePath("/statistics");
}

// ─────────────────────────────────────────────────────────────────────────────
// Wipe everything in the workspace — files + analyses. Keeps the workspace
// row itself so the user's bonus pool history (if any) stays linked.
// ─────────────────────────────────────────────────────────────────────────────

export async function clearStatsWorkspaceAction(): Promise<void> {
  const user = await requireUser();
  const ws = await prisma.statsWorkspace.findUnique({
    where: { userId: user.id },
    include: { files: { select: { id: true, filePathname: true } } },
  });
  if (!ws) return;
  for (const f of ws.files) {
    if (f.filePathname) void del(f.filePathname).catch(() => {});
  }
  await prisma.$transaction([
    prisma.statsAnalysis.deleteMany({ where: { workspaceId: ws.id } }),
    prisma.statsFile.deleteMany({ where: { workspaceId: ws.id } }),
  ]);
  revalidatePath("/statistics");
}

// ─────────────────────────────────────────────────────────────────────────────
// Run a new analysis on one of the workspace's files.
// ─────────────────────────────────────────────────────────────────────────────

export async function addStatsAnalysisAction(
  _prev: StatsAnalysisState,
  formData: FormData
): Promise<StatsAnalysisState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return { ok: false, error: upgradeRequiredError() };
  }
  const kind = String(formData.get("kind") ?? "");
  if (!isAnalysisKind(kind)) {
    return { ok: false, error: "Unsupported analysis kind." };
  }

  const fileId = String(formData.get("fileId") ?? "");
  if (!fileId) {
    return { ok: false, error: "Pick a data file to run this analysis on." };
  }

  const file = await prisma.statsFile.findUnique({
    where: { id: fileId },
    include: { workspace: { select: { id: true, userId: true } } },
  });
  if (!file || file.workspace.userId !== user.id) {
    return { ok: false, error: "File not found." };
  }

  const csv = parseCsv(file.extractedText);
  if (csv.columns.length === 0) {
    return { ok: false, error: "Couldn't parse this file as a CSV." };
  }

  const quotaError = await preflightStatsAnalysis(user.id, user.plan);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    const input = parseDispatchInput(formData);
    const out = dispatchAnalysis(csv, input);
    const config: Record<string, unknown> = {
      ...out.config,
      fileId,
      filename: file.filename,
    };
    const created = await prisma.statsAnalysis.create({
      data: {
        workspaceId: file.workspace.id,
        fileId,
        kind: input.kind,
        title: out.title,
        configJson: JSON.stringify(config),
        resultJson: JSON.stringify(out.resultJson),
        resultSvg: out.resultSvg,
        computedAt: new Date(),
      },
    });
    await recordStatsAnalysisRun(user.id, user.plan);
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
