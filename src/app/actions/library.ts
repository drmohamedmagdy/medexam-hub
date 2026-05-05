"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/library";

export type LibraryUploadState = { ok?: boolean; error?: string } | null;

const MetaSchema = z.object({
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().min(2).max(80).trim(),
  isPublished: z.boolean().default(true),
});

export async function adminUploadLibraryAction(
  _prev: LibraryUploadState,
  formData: FormData
): Promise<LibraryUploadState> {
  const admin = await requireAdmin();

  const parsed = MetaSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file to upload." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      error:
        "Unsupported file type. Allowed: PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), or plain text.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `File is too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`,
    };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  await prisma.libraryResource.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      fileData: buf,
      uploadedBy: admin.id,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath("/library");
  redirect("/admin/library");
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
