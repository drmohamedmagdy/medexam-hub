"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ALLOWED_MIME_TYPES } from "@/lib/library";

export type LibraryCreateState = { ok?: boolean; error?: string } | null;

const CreateSchema = z.object({
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().min(2).max(80).trim(),
  isPublished: z.boolean().default(true),
  fileUrl: z.string().url(),
  filePathname: z.string().min(1).max(500),
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(1),
});

/**
 * Saves the metadata row for a library resource AFTER the client has
 * already uploaded the file directly to Vercel Blob. Called from the
 * UploadForm once the blob URL is in hand.
 */
export async function adminCreateLibraryRecordAction(
  _prev: LibraryCreateState,
  formData: FormData
): Promise<LibraryCreateState> {
  const admin = await requireAdmin();

  const parsed = CreateSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isPublished: formData.get("isPublished") === "true",
    fileUrl: formData.get("fileUrl") ?? "",
    filePathname: formData.get("filePathname") ?? "",
    filename: formData.get("filename") ?? "",
    mimeType: formData.get("mimeType") ?? "",
    sizeBytes: formData.get("sizeBytes") ?? "0",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!ALLOWED_MIME_TYPES.includes(parsed.data.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      error:
        "Unsupported file type. Allowed: PDF, Word, PowerPoint, or plain text.",
    };
  }

  await prisma.libraryResource.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      fileUrl: parsed.data.fileUrl,
      filePathname: parsed.data.filePathname,
      uploadedBy: admin.id,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath("/library");
  return { ok: true };
}

export type LibraryEditState = { ok?: boolean; error?: string } | null;

const EditSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().min(2).max(80).trim(),
  isPublished: z.boolean().default(true),
});

export async function adminEditLibraryAction(
  _prev: LibraryEditState,
  formData: FormData
): Promise<LibraryEditState> {
  await requireAdmin();
  const parsed = EditSchema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.libraryResource.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${parsed.data.id}`);
  revalidatePath("/library");
  return { ok: true };
}

export async function adminDeleteLibraryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Look up the blob URL so we can delete the file from Vercel Blob too.
  // If blob deletion fails, we still proceed with the DB delete — better to
  // have an orphan blob than a stuck row.
  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: { fileUrl: true },
  });
  if (r?.fileUrl) {
    await del(r.fileUrl).catch(() => {});
  }

  await prisma.libraryResource.delete({ where: { id } });
  revalidatePath("/admin/library");
  revalidatePath("/library");
  redirect("/admin/library");
}

export async function adminTogglePublishLibraryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const r = await prisma.libraryResource.findUnique({ where: { id }, select: { isPublished: true } });
  if (!r) return;
  await prisma.libraryResource.update({
    where: { id },
    data: { isPublished: !r.isPublished },
  });
  revalidatePath("/admin/library");
  revalidatePath("/library");
}
