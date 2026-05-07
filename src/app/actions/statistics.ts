"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";
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

export type StatsState = { ok?: boolean; error?: string } | null;
export type StatsAnalysisState =
  | { ok?: boolean; error?: string; analysisId?: string }
  | null;

async function getOrCreateWorkspace(userId: string) {
  const existing = await prisma.statsWorkspace.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.statsWorkspace.create({ data: { userId } });
}

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
  if (!canUseResearch(user.plan)) {
    return {
      error:
        "Statistics is part of the Research suite — available on the Researcher plan or Premium.",
    };
  }

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

export async function addStatsAnalysisAction(
  _prev: StatsAnalysisState,
  formData: FormData
): Promise<StatsAnalysisState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return {
      ok: false,
      error: "Statistics requires the Researcher plan or Premium.",
    };
  }
  const kind = String(formData.get("kind") ?? "");
  if (!isAnalysisKind(kind)) {
    return { ok: false, error: "Unsupported analysis kind." };
  }

  const ws = await prisma.statsWorkspace.findUnique({ where: { userId: user.id } });
  if (!ws || !ws.extractedText) {
    return { ok: false, error: "Upload a CSV first." };
  }

  const csv = parseCsv(ws.extractedText);
  if (csv.columns.length === 0) {
    return { ok: false, error: "Couldn't parse this file as a CSV." };
  }

  // Researcher plan: enforce monthly stats analyses quota. Premium has no
  // quota for stats (free, local computation).
  const quotaError = await preflightStatsAnalysis(user.id, user.plan);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    const input = parseDispatchInput(formData);
    const out = dispatchAnalysis(csv, input);
    const config: Record<string, unknown> = { ...out.config, filename: ws.filename ?? null };
    const created = await prisma.statsAnalysis.create({
      data: {
        workspaceId: ws.id,
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
