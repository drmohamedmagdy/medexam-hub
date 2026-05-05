"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markAllRead, markRead } from "@/lib/notifications";

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markRead(user.id, [id]);
  revalidatePath("/notifications");
}
