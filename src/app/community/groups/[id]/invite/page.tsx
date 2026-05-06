import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import InviteForm from "./InviteForm";

export const metadata = { title: "Invite to group" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale).community;

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

  const emoji = group.isPublic ? "🌐" : "🔒";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/community/groups/${id}`} className="text-sm text-zinc-500 hover:text-blue-600">
        {t.invitePageBack.replace("{group}", group.name)}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {t.invitePageTitle.replace("{emoji}", emoji).replace("{group}", group.name)}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{t.invitePageSubtitle}</p>

      <InviteForm groupId={id} t={t} />

      {recentInvites.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t.inviteRecentHeading}</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {recentInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 truncate font-mono text-zinc-700 dark:text-zinc-300">
                  {inv.email}
                </span>
                <span className="shrink-0 text-xs">
                  {inv.acceptedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {t.inviteStatusAccepted}
                    </span>
                  ) : inv.expiresAt < new Date() ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                      {t.inviteStatusExpired}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {t.inviteStatusSent}
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
