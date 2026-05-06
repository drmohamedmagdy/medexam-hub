import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import { acceptInviteAction } from "@/app/actions/community";

export const metadata = { title: "Accept invite — MedExam Hub" };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Not signed in — bounce to signup with the invite as the next URL.
  if (!user) {
    const next = `/community/groups/join/${id}`;
    redirect(`/signup?next=${encodeURIComponent(next)}`);
  }

  const locale = await getLocale();
  const t = getTranslations(locale).community;

  const invite = await prisma.groupInvite.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true, isPublic: true, description: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">{t.acceptNotFoundTitle}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t.acceptNotFoundBody}</p>
        <Link
          href="/community"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {t.acceptBackToCommunity}
        </Link>
      </div>
    );
  }

  // Already a member? Just bounce to the group.
  const existingMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
  });
  if (existingMember) {
    redirect(`/community/groups/${invite.groupId}`);
  }

  const inviterFirstName =
    invite.invitedBy.name?.split(" ")[0] ?? invite.invitedBy.email.split("@")[0];

  if (invite.acceptedAt) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">{t.acceptUsedTitle}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {t.acceptUsedBody.replace("{name}", inviterFirstName)}
        </p>
        <Link
          href={`/community/groups/${invite.groupId}`}
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {t.acceptSeeGroup}
        </Link>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">{t.acceptExpiredTitle}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {t.acceptExpiredBody.replace("{name}", inviterFirstName)}
        </p>
      </div>
    );
  }

  const inviterLabel = invite.invitedBy.name ?? invite.invitedBy.email.split("@")[0];
  const emoji = invite.group.isPublic ? "🌐" : "🔒";

  // The body has both {inviter} and {emoji} {group} as a single phrase — split
  // around the inviter token so we can bold it without losing localized order.
  const bodyParts = t.acceptInviteBody.split("{inviter}");
  const groupSegmentRaw = bodyParts.slice(1).join("{inviter}");
  const groupSegment = groupSegmentRaw
    .split("{emoji}")
    .join(emoji);
  const groupParts = groupSegment.split("{group}");

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-4xl" aria-hidden>👋</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t.acceptInviteHeading}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {bodyParts[0]}
          <strong>{inviterLabel}</strong>
          {groupParts[0]}
          <strong>{invite.group.name}</strong>
          {groupParts.slice(1).join("{group}")}
        </p>
        {invite.group.description && (
          <p className="mt-3 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
            {invite.group.description}
          </p>
        )}
        <form action={acceptInviteAction} className="mt-6">
          <input type="hidden" name="inviteId" value={invite.id} />
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t.acceptInviteSubmit}
          </button>
        </form>
        <Link
          href="/community"
          className="mt-3 inline-block text-xs text-zinc-500 hover:text-blue-600"
        >
          {t.acceptInviteDecline}
        </Link>
      </div>
    </div>
  );
}
