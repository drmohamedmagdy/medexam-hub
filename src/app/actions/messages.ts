"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export type SendMessageState =
  | { ok: true; messageId: string }
  | { ok: false; error: string }
  | null;

const SendSchema = z.object({
  receiverId: z.string().min(1).max(80),
  body: z.string().min(1).max(5000),
});

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const user = await requireUser();
  const parsed = SendSchema.safeParse({
    receiverId: formData.get("receiverId"),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.receiverId === user.id) {
    return { ok: false, error: "You can't send a message to yourself." };
  }
  const receiver = await prisma.user.findUnique({
    where: { id: parsed.data.receiverId },
    select: { id: true, name: true, email: true },
  });
  if (!receiver) {
    return { ok: false, error: "Recipient not found." };
  }

  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId: receiver.id,
      body: parsed.data.body,
    },
    select: { id: true },
  });

  // Notify the recipient — the bell tells them a DM is waiting.
  const senderName = user.name?.trim() || user.email.split("@")[0];
  const preview = parsed.data.body.length > 80
    ? parsed.data.body.slice(0, 77) + "…"
    : parsed.data.body;
  await createNotification({
    userId: receiver.id,
    category: "system",
    emoji: "✉️",
    title: `New message from ${senderName}`,
    body: preview,
    href: `/messages/${user.id}`,
  });

  revalidatePath(`/messages/${user.id}`);
  revalidatePath(`/messages/${receiver.id}`);
  revalidatePath("/messages");
  return { ok: true, messageId: message.id };
}

/** Opens a thread with another user — used by "Send message" buttons. */
export async function openMessageThreadAction(formData: FormData): Promise<void> {
  await requireUser();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/messages");
  redirect(`/messages/${userId}`);
}

/** Marks every message FROM the given sender TO the current user as read. */
export async function markThreadReadAction(senderId: string): Promise<void> {
  const user = await requireUser();
  if (!senderId) return;
  await prisma.message.updateMany({
    where: {
      senderId,
      receiverId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/messages");
  revalidatePath(`/messages/${senderId}`);
}
