"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ALLOWED_CONTENT_MIME_TYPES } from "@/lib/library";

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
  coverUrl: z.string().url().optional().or(z.literal("")),
  coverPathname: z.string().max(500).optional().or(z.literal("")),
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
    coverUrl: formData.get("coverUrl") ?? "",
    coverPathname: formData.get("coverPathname") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (
    !ALLOWED_CONTENT_MIME_TYPES.includes(
      parsed.data.mimeType as (typeof ALLOWED_CONTENT_MIME_TYPES)[number]
    )
  ) {
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
      coverUrl: parsed.data.coverUrl || null,
      coverPathname: parsed.data.coverPathname || null,
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

  // Look up the blob URLs so we can delete both the content file AND the
  // cover image from Vercel Blob. If a blob deletion fails, we still
  // proceed with the DB delete — orphaned blobs are recoverable later;
  // a stuck row blocks admin work.
  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: { fileUrl: true, coverUrl: true },
  });
  if (r?.fileUrl) await del(r.fileUrl).catch(() => {});
  if (r?.coverUrl) await del(r.coverUrl).catch(() => {});

  await prisma.libraryResource.delete({ where: { id } });
  revalidatePath("/admin/library");
  revalidatePath("/library");
  redirect("/admin/library");
}

/**
 * Updates just the cover image URL on an existing resource. The new cover
 * was already uploaded to Blob client-side; this action saves the URL and
 * removes the old cover from storage if there was one.
 */
const SetCoverSchema = z.object({
  id: z.string().min(1),
  coverUrl: z.string().url(),
  coverPathname: z.string().min(1).max(500),
});

export type LibrarySetCoverState = { ok?: boolean; error?: string } | null;

export async function adminSetLibraryCoverAction(
  _prev: LibrarySetCoverState,
  formData: FormData
): Promise<LibrarySetCoverState> {
  await requireAdmin();
  const parsed = SetCoverSchema.safeParse({
    id: formData.get("id") ?? "",
    coverUrl: formData.get("coverUrl") ?? "",
    coverPathname: formData.get("coverPathname") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid cover" };
  }

  const existing = await prisma.libraryResource.findUnique({
    where: { id: parsed.data.id },
    select: { coverUrl: true },
  });
  if (!existing) return { error: "Resource not found" };

  // Remove the old cover from Blob, if any
  if (existing.coverUrl) {
    await del(existing.coverUrl).catch(() => {});
  }

  await prisma.libraryResource.update({
    where: { id: parsed.data.id },
    data: {
      coverUrl: parsed.data.coverUrl,
      coverPathname: parsed.data.coverPathname,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${parsed.data.id}`);
  revalidatePath("/library");
  return { ok: true };
}

/** Removes the cover image from a resource (file blob deleted; field cleared). */
export async function adminClearLibraryCoverAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: { coverUrl: true },
  });
  if (r?.coverUrl) await del(r.coverUrl).catch(() => {});
  await prisma.libraryResource.update({
    where: { id },
    data: { coverUrl: null, coverPathname: null },
  });
  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${id}`);
  revalidatePath("/library");
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
