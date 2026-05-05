import { prisma } from "@/lib/db";

export type NotificationCategory = "achievement" | "system" | "reminder" | "broadcast";

export type CreateNotificationInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  href?: string;
  emoji?: string;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      emoji: input.emoji ?? null,
    },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listNotifications(
  userId: string,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    category: string;
    title: string;
    body: string | null;
    href: string | null;
    emoji: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>
> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      href: true,
      emoji: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
