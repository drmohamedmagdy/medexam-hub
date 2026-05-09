"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ProfileState = { ok?: boolean; error?: string } | null;

const UpdateSchema = z.object({
  name: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
  profilePublic: z.boolean().default(true),
  // Optional avatar swap. Empty strings ⇒ leave the existing avatar
  // alone. Both must be provided together for a successful swap.
  avatarUrl: z.string().url().optional().or(z.literal("")),
  avatarPathname: z.string().max(500).optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = UpdateSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    profilePublic:
      formData.get("profilePublic") === "on" ||
      formData.get("profilePublic") === "true",
    avatarUrl: String(formData.get("avatarUrl") ?? "").trim(),
    avatarPathname: String(formData.get("avatarPathname") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Resolve avatar updates: if a new URL was uploaded this request, swap.
  // Best-effort delete the old blob.
  const newAvatar = parsed.data.avatarUrl;
  const newPathname = parsed.data.avatarPathname;
  let avatarFields: { avatarUrl?: string; avatarPathname?: string } = {};
  if (newAvatar && newPathname) {
    avatarFields = { avatarUrl: newAvatar, avatarPathname: newPathname };
    if (user.avatarPathname && user.avatarPathname !== newPathname) {
      void del(user.avatarPathname).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name || null,
      bio: parsed.data.bio || null,
      profilePublic: parsed.data.profilePublic,
      ...avatarFields,
    },
  });

  revalidatePath(`/u/${user.id}`);
  revalidatePath(`/u/${user.id}/edit`);
  return { ok: true };
}

/** Removes the user's avatar (deletes the blob + clears the columns). */
export async function removeAvatarAction(): Promise<void> {
  const user = await requireUser();
  if (user.avatarPathname) {
    void del(user.avatarPathname).catch(() => {});
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null, avatarPathname: null },
  });
  revalidatePath(`/u/${user.id}`);
  revalidatePath(`/u/${user.id}/edit`);
}
