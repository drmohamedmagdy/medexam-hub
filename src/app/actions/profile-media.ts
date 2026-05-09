"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type MediaState = { ok?: boolean; error?: string } | null;

const AddSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(1).max(50 * 1024 * 1024),
  caption: z.string().max(280).optional().or(z.literal("")),
  originalName: z.string().max(255).optional().or(z.literal("")),
});

function kindFromMime(mime: string): "image" | "video" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export async function addProfileMediaAction(
  _prev: MediaState,
  formData: FormData
): Promise<MediaState> {
  const user = await requireUser();
  const parsed = AddSchema.safeParse({
    url: formData.get("url"),
    pathname: formData.get("pathname"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    caption: String(formData.get("caption") ?? "").trim(),
    originalName: String(formData.get("originalName") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const kind = kindFromMime(parsed.data.mimeType);

  // Sort order = current count, so new items show up at the end.
  const count = await prisma.profileMedia.count({ where: { userId: user.id } });
  if (count >= 30) {
    return { error: "Profile gallery is limited to 30 items. Remove some to add more." };
  }

  await prisma.profileMedia.create({
    data: {
      userId: user.id,
      kind,
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      caption: parsed.data.caption || null,
      originalName:
        kind === "file" ? parsed.data.originalName || null : null,
      sortOrder: count,
    },
  });

  revalidatePath(`/u/${user.id}`);
  revalidatePath(`/u/${user.id}/edit`);
  return { ok: true };
}

export async function removeProfileMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const item = await prisma.profileMedia.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return;
  if (item.pathname) void del(item.pathname).catch(() => {});
  await prisma.profileMedia.delete({ where: { id } });
  revalidatePath(`/u/${user.id}`);
  revalidatePath(`/u/${user.id}/edit`);
}
