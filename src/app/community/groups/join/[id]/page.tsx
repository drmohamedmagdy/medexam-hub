import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This invite link doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/community"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back to community
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

  if (invite.acceptedAt) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">This invite was already used</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ask {invite.invitedBy.name?.split(" ")[0] ?? "the inviter"} to send a new one if you still need access.
        </p>
        <Link
          href={`/community/groups/${invite.groupId}`}
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          See group
        </Link>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">This invite has expired</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ask {invite.invitedBy.name?.split(" ")[0] ?? "the inviter"} to send a new one.
        </p>
      </div>
    );
  }

  const inviterLabel = invite.invitedBy.name ?? invite.invitedBy.email.split("@")[0];

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-4xl" aria-hidden>👋</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">You&apos;ve been invited</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong>{inviterLabel}</strong> is inviting you to join{" "}
          <strong>{invite.group.isPublic ? "🌐" : "🔒"} {invite.group.name}</strong>.
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
            Accept and join
          </button>
        </form>
        <Link
          href="/community"
          className="mt-3 inline-block text-xs text-zinc-500 hover:text-blue-600"
        >
          Not interested
        </Link>
      </div>
    </div>
  );
}
