import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user) return false;
  const allowlist = getAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(user.email.toLowerCase());
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}
