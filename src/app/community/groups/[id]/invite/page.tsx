import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import InviteForm from "./InviteForm";

export const metadata = { title: "Invite to group" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true, isPublic: true, ownerId: true, inviteCode: true },
  });
  if (!group) redirect("/community/groups");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect(`/community/groups/${id}`);
  }

  const recentInvites = await prisma.groupInvite.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/community/groups/${id}`} className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; {group.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Invite people to {group.isPublic ? "🌐" : "🔒"} {group.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Each address gets an emailed invite link. Links expire in 14 days.
      </p>

      <InviteForm groupId={id} />

      {recentInvites.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent invites</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {recentInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 truncate font-mono text-zinc-700 dark:text-zinc-300">
                  {inv.email}
                </span>
                <span className="shrink-0 text-xs">
                  {inv.acceptedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Accepted
                    </span>
                  ) : inv.expiresAt < new Date() ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                      Expired
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Sent
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
