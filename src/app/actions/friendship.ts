"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pair } from "@/lib/friendship";
import { createNotification } from "@/lib/notifications";

export type FriendActionState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const SendSchema = z.object({
  targetUserId: z.string().min(1).max(80),
  message: z.string().max(500).optional().or(z.literal("")),
});

/** Sender requests friendship with target. Idempotent on duplicates. */
export async function sendFriendRequestAction(
  _prev: FriendActionState,
  formData: FormData
): Promise<FriendActionState> {
  const me = await requireUser();
  const parsed = SendSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.targetUserId === me.id) {
    return { ok: false, error: "You can't friend yourself." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return { ok: false, error: "User not found." };

  const { userAId, userBId } = pair(me.id, target.id);

  // Look first so we can refuse to clobber an accepted/pending row. Upsert
  // alone can't express "create or revive-from-rejected only" without this.
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true, requestedBy: true },
  });
  if (existing?.status === "accepted") return { ok: true };
  if (existing?.status === "pending") return { ok: true };

  if (existing) {
    await prisma.friendship.update({
      where: { userAId_userBId: { userAId, userBId } },
      data: {
        status: "pending",
        requestedBy: me.id,
        message: parsed.data.message || null,
        decidedAt: null,
      },
    });
  } else {
    await prisma.friendship.create({
      data: {
        userAId,
        userBId,
        status: "pending",
        requestedBy: me.id,
        message: parsed.data.message || null,
      },
    });
  }

  const senderName = me.name?.trim() || me.email.split("@")[0];
  await createNotification({
    userId: target.id,
    category: "system",
    emoji: "🤝",
    title: `${senderName} sent you a friend request`,
    body: parsed.data.message
      ? `Their note: ${parsed.data.message.slice(0, 120)}${parsed.data.message.length > 120 ? "…" : ""}`
      : "Open their profile to accept or decline.",
    href: `/u/${me.id}`,
  });

  revalidatePath(`/u/${me.id}`);
  revalidatePath(`/u/${target.id}`);
  return { ok: true };
}

const DecideSchema = z.object({
  otherUserId: z.string().min(1).max(80),
});

export async function acceptFriendRequestAction(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = DecideSchema.safeParse({
    otherUserId: formData.get("otherUserId"),
  });
  if (!parsed.success) return;
  const { userAId, userBId } = pair(me.id, parsed.data.otherUserId);
  const row = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!row || row.status !== "pending" || row.requestedBy === me.id) return;

  await prisma.friendship.update({
    where: { userAId_userBId: { userAId, userBId } },
    data: { status: "accepted", decidedAt: new Date() },
  });

  const myName = me.name?.trim() || me.email.split("@")[0];
  await createNotification({
    userId: row.requestedBy,
    category: "system",
    emoji: "✅",
    title: `${myName} accepted your friend request`,
    body: "You can see each other's stats, gallery, and activity now.",
    href: `/u/${me.id}`,
  });

  revalidatePath(`/u/${me.id}`);
  revalidatePath(`/u/${parsed.data.otherUserId}`);
}

export async function rejectFriendRequestAction(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = DecideSchema.safeParse({
    otherUserId: formData.get("otherUserId"),
  });
  if (!parsed.success) return;
  const { userAId, userBId } = pair(me.id, parsed.data.otherUserId);
  const row = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!row || row.status !== "pending" || row.requestedBy === me.id) return;

  await prisma.friendship.update({
    where: { userAId_userBId: { userAId, userBId } },
    data: { status: "rejected", decidedAt: new Date() },
  });

  revalidatePath(`/u/${me.id}`);
  revalidatePath(`/u/${parsed.data.otherUserId}`);
}

export async function removeFriendshipAction(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = DecideSchema.safeParse({
    otherUserId: formData.get("otherUserId"),
  });
  if (!parsed.success) return;
  const { userAId, userBId } = pair(me.id, parsed.data.otherUserId);
  await prisma.friendship.deleteMany({
    where: { userAId, userBId },
  });
  revalidatePath(`/u/${me.id}`);
  revalidatePath(`/u/${parsed.data.otherUserId}`);
}
