import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: partnerId } = await params;
  if (partnerId === me.id) return Response.json({ messages: [] });

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const sinceFilter =
    since && !Number.isNaN(since.getTime()) ? { sentAt: { gt: since } } : {};

  const messages = await prisma.message.findMany({
    where: {
      AND: [
        sinceFilter,
        {
          OR: [
            { senderId: me.id, receiverId: partnerId },
            { senderId: partnerId, receiverId: me.id },
          ],
        },
      ],
    },
    orderBy: { sentAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      body: true,
      sentAt: true,
    },
  });

  // Mark inbound as read on every poll. Cheap, and it keeps the bell tidy
  // while the recipient is actively viewing the thread.
  await prisma.message.updateMany({
    where: { senderId: partnerId, receiverId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  return Response.json({ messages });
}

const SendSchema = z.object({ body: z.string().min(1).max(5000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: partnerId } = await params;
  if (partnerId === me.id) {
    return Response.json(
      { error: "You can't message yourself." },
      { status: 400 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = SendSchema.safeParse({
    body: typeof json?.body === "string" ? json.body.trim() : "",
  });
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, email: true },
  });
  if (!partner) {
    return Response.json({ error: "Recipient not found." }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { senderId: me.id, receiverId: partner.id, body: parsed.data.body },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      body: true,
      sentAt: true,
    },
  });

  const senderName = me.name?.trim() || me.email.split("@")[0];
  const preview =
    parsed.data.body.length > 80
      ? parsed.data.body.slice(0, 77) + "…"
      : parsed.data.body;
  await createNotification({
    userId: partner.id,
    category: "system",
    emoji: "✉️",
    title: `New message from ${senderName}`,
    body: preview,
    href: `/messages/${me.id}`,
  });

  return Response.json({ message });
}
