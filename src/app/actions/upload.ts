"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, currentYearMonth } from "@/lib/plans";
import { getMonthlyFileUploads, recordFileUploaded } from "@/lib/quota";
import {
  extractText,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_BYTES,
} from "@/lib/file-upload";
import { summariseFile } from "@/lib/file-summary";
import { getLocale } from "@/lib/i18n-server";

export type UploadState = {
  error?: string;
  ok?: boolean;
  fileId?: string;
  summaryFailed?: boolean;
} | null;

export async function uploadFileAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const user = await requireUser();

  if (PLAN_LIMITS[user.plan].fileUploadsPerMonth === 0) {
    return {
      error: "File upload is available on Pro and Premium plans. Upgrade to use this feature.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please pick a file." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      error: `File too large. Maximum size is ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
    };
  }

  const mimeType = file.type || "application/octet-stream";
  const filename = file.name;
  const lowerName = filename.toLowerCase();
  const isAcceptedExtension =
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md");
  const isAcceptedMime = (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);

  if (!isAcceptedMime && !isAcceptedExtension) {
    return {
      error: "Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.",
    };
  }

  const usage = await getMonthlyFileUploads(user.id, user.plan);
  if (usage.remaining < 1) {
    return {
      error: `You've used all ${usage.limit} file uploads this month on the ${PLAN_LIMITS[user.plan].label} plan.`,
    };
  }

  let extracted;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    extracted = await extractText(buf, mimeType, filename);
  } catch (e) {
    return {
      error: `Couldn't read the file: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  if (extracted.charCount < 50) {
    return {
      error: "We couldn't extract enough text from this file. Try a different document.",
    };
  }

  const wantSummary = formData.get("generateSummary") === "on";

  const record = await prisma.fileUpload.create({
    data: {
      userId: user.id,
      filename,
      mimeType,
      sizeBytes: file.size,
      charCount: extracted.charCount,
      extractedText: extracted.text,
      yearMonth: currentYearMonth(),
    },
  });

  // If this upload pushed the user past their plan's monthly file limit,
  // drain 1 from their bonus file pool. No-op when still within plan quota.
  await recordFileUploaded(user.id, user.plan);

  let summaryFailed = false;
  if (wantSummary) {
    try {
      const locale = await getLocale();
      const summaryText = await summariseFile({
        text: extracted.text,
        filename,
        language: locale,
      });

      await prisma.fileUpload.update({
        where: { id: record.id },
        data: {
          summaryText,
          summaryCreatedAt: new Date(),
        },
      });
    } catch (e) {
      // Surface the failure but don't lose the upload — the user can still use
      // the file to generate exams; they'd just have to retry the summary.
      summaryFailed = true;
      console.error("[upload] summary generation failed:", e);
    }
  }

  revalidatePath("/exam/new");
  return { ok: true, fileId: record.id, summaryFailed: summaryFailed || undefined };
}
