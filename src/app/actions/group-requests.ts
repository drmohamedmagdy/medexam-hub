"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export type RequestState = { ok?: boolean; error?: string } | null;

const RequestSchema = z.object({
  groupId: z.string().min(1),
  message: z.string().max(500).optional().or(z.literal("")),
});

/**
 * A non-member asks to join a group. Public groups skip the request flow
 * and use joinPublicGroupAction directly; this is for private groups
 * where the owner has to approve.
 */
export async function requestJoinGroupAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  const user = await requireUser();
  const parsed = RequestSchema.safeParse({
    groupId: formData.get("groupId"),
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.data.groupId },
    select: { id: true, ownerId: true, name: true, isPublic: true },
  });
  if (!group) return { error: "Group not found." };

  // Already a member? Treat as success — nothing to do.
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    select: { id: true },
  });
  if (member) return { ok: true };

  // Public groups skip the request — they get joined directly.
  if (group.isPublic) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id, role: "member" },
    });
    revalidatePath(`/community/groups/${group.id}`);
    return { ok: true };
  }

  // Idempotent: re-requesting bumps an existing pending row's message.
  await prisma.groupJoinRequest.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    update: {
      message: parsed.data.message || null,
      status: "pending",
      decidedAt: null,
      decidedBy: null,
    },
    create: {
      groupId: group.id,
      userId: user.id,
      message: parsed.data.message || null,
    },
  });

  // Tell the owner there's a request waiting.
  const requesterName = user.name?.trim() || user.email.split("@")[0];
  await createNotification({
    userId: group.ownerId,
    category: "system",
    emoji: "🤝",
    title: `${requesterName} wants to join "${group.name}"`,
    body: parsed.data.message
      ? `Their note: ${parsed.data.message.slice(0, 120)}${parsed.data.message.length > 120 ? "…" : ""}`
      : "Open the group to approve or reject the request.",
    href: `/community/groups/${group.id}`,
  });

  revalidatePath(`/community/groups/${group.id}`);
  return { ok: true };
}

/** Owner / admin approves a pending join request. */
export async function approveJoinRequestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const req = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: { group: { select: { id: true, ownerId: true, name: true } } },
  });
  if (!req) return;

  // Only owner (or admin members) can approve. For now, owner-only.
  if (req.group.ownerId !== user.id) return;
  if (req.status !== "pending") return;

  await prisma.$transaction([
    prisma.groupJoinRequest.update({
      where: { id: req.id },
      data: { status: "approved", decidedAt: new Date(), decidedBy: user.id },
    }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.groupId, userId: req.userId } },
      update: {},
      create: { groupId: req.groupId, userId: req.userId, role: "member" },
    }),
  ]);

  await createNotification({
    userId: req.userId,
    category: "system",
    emoji: "✅",
    title: `You're in — "${req.group.name}"`,
    body: "Your request to join was approved. Open the group to start posting.",
    href: `/community/groups/${req.groupId}`,
  });

  revalidatePath(`/community/groups/${req.groupId}`);
}

/** Owner rejects a request. The requester gets a quiet notification. */
export async function rejectJoinRequestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const req = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: { group: { select: { ownerId: true, name: true } } },
  });
  if (!req) return;
  if (req.group.ownerId !== user.id) return;
  if (req.status !== "pending") return;

  await prisma.groupJoinRequest.update({
    where: { id: req.id },
    data: { status: "rejected", decidedAt: new Date(), decidedBy: user.id },
  });

  await createNotification({
    userId: req.userId,
    category: "system",
    emoji: "🙏",
    title: `Request to join "${req.group.name}" was declined`,
    body: "The owner couldn't add you to this group right now.",
    href: "/community/groups",
  });

  revalidatePath(`/community/groups/${req.groupId}`);
}
