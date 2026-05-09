"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ALLOWED_VIDEO_MIME_TYPES } from "@/lib/courses";

export type CourseCreateState = { ok?: boolean; error?: string } | null;

const CreateSchema = z.object({
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(4000).optional().or(z.literal("")),
  category: z.string().min(2).max(80).trim(),
  isPublished: z.boolean().default(true),
  videoUrl: z.string().url(),
  videoPathname: z.string().min(1).max(500),
  videoFilename: z.string().min(1).max(300),
  videoMimeType: z.string().min(1).max(200),
  videoSizeBytes: z.coerce.number().int().min(1),
  durationSec: z.coerce.number().int().min(0).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  thumbnailPathname: z.string().max(500).optional().or(z.literal("")),
});

export async function adminCreateCourseAction(
  _prev: CourseCreateState,
  formData: FormData
): Promise<CourseCreateState> {
  const admin = await requireAdmin();

  const parsed = CreateSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isPublished: formData.get("isPublished") === "true",
    videoUrl: formData.get("videoUrl") ?? "",
    videoPathname: formData.get("videoPathname") ?? "",
    videoFilename: formData.get("videoFilename") ?? "",
    videoMimeType: formData.get("videoMimeType") ?? "",
    videoSizeBytes: formData.get("videoSizeBytes") ?? "0",
    durationSec: formData.get("durationSec") ?? undefined,
    thumbnailUrl: formData.get("thumbnailUrl") ?? "",
    thumbnailPathname: formData.get("thumbnailPathname") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (
    !ALLOWED_VIDEO_MIME_TYPES.includes(
      parsed.data.videoMimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number]
    )
  ) {
    return {
      error:
        "Unsupported video type. Allowed: MP4, WebM, OGG, QuickTime (.mov), Matroska (.mkv).",
    };
  }

  await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      videoFilename: parsed.data.videoFilename,
      videoMimeType: parsed.data.videoMimeType,
      videoSizeBytes: parsed.data.videoSizeBytes,
      videoUrl: parsed.data.videoUrl,
      videoPathname: parsed.data.videoPathname,
      durationSec: parsed.data.durationSec ?? null,
      thumbnailUrl: parsed.data.thumbnailUrl || null,
      thumbnailPathname: parsed.data.thumbnailPathname || null,
      uploadedBy: admin.id,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  return { ok: true };
}

export type CourseEditState = { ok?: boolean; error?: string } | null;

const EditSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(4000).optional().or(z.literal("")),
  category: z.string().min(2).max(80).trim(),
  isPublished: z.boolean().default(true),
});

export async function adminEditCourseAction(
  _prev: CourseEditState,
  formData: FormData
): Promise<CourseEditState> {
  await requireAdmin();
  const parsed = EditSchema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isPublished:
      formData.get("isPublished") === "on" ||
      formData.get("isPublished") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.course.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${parsed.data.id}`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${parsed.data.id}`);
  return { ok: true };
}

export async function adminTogglePublishCourseAction(
  formData: FormData
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const c = await prisma.course.findUnique({
    where: { id },
    select: { isPublished: true },
  });
  if (!c) return;
  await prisma.course.update({
    where: { id },
    data: { isPublished: !c.isPublished },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

export async function adminDeleteCourseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const c = await prisma.course.findUnique({
    where: { id },
    select: { videoUrl: true, thumbnailUrl: true },
  });
  if (c?.videoUrl) await del(c.videoUrl).catch(() => {});
  if (c?.thumbnailUrl) await del(c.thumbnailUrl).catch(() => {});

  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses");
}

/** Increment view counter — called from the detail page when a video starts. */
export async function incrementCourseViewAction(courseId: string): Promise<void> {
  if (!courseId) return;
  await prisma.course
    .update({
      where: { id: courseId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});
}
