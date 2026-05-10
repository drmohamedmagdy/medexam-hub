import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyFriendActionToken } from "@/lib/email";
import { pair } from "@/lib/friendship";
import { createNotification } from "@/lib/notifications";

export const metadata = { title: "Friend request — MedExam Hub" };

type Outcome =
  | { kind: "accepted"; senderName: string; senderId: string }
  | { kind: "declined"; senderName: string }
  | { kind: "already-friends"; senderName: string; senderId: string }
  | { kind: "no-pending" }
  | { kind: "invalid-token" }
  | { kind: "invalid-action" };

async function processRequest(
  token: string | undefined,
  action: string | undefined
): Promise<Outcome> {
  if (!token) return { kind: "invalid-token" };
  if (action !== "accept" && action !== "reject") {
    return { kind: "invalid-action" };
  }
  const verified = verifyFriendActionToken(token);
  if (!verified) return { kind: "invalid-token" };

  const { recipientId, senderId } = verified;
  const { userAId, userBId } = pair(recipientId, senderId);

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, name: true, email: true },
  });
  const senderName = sender?.name?.trim() || sender?.email.split("@")[0] || "Someone";

  const row = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true, status: true, requestedBy: true },
  });

  if (!row) return { kind: "no-pending" };
  if (row.status === "accepted") {
    return {
      kind: "already-friends",
      senderName,
      senderId,
    };
  }
  if (row.status !== "pending") return { kind: "no-pending" };
  if (row.requestedBy !== senderId) {
    // The pending row exists but the sender isn't who originated it
    // — either the data shifted or the token is for a stale request.
    return { kind: "no-pending" };
  }

  if (action === "accept") {
    await prisma.friendship.update({
      where: { userAId_userBId: { userAId, userBId } },
      data: { status: "accepted", decidedAt: new Date() },
    });
    // Notify the sender that the recipient accepted.
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { name: true, email: true },
    });
    const recipientName =
      recipient?.name?.trim() || recipient?.email.split("@")[0] || "They";
    await createNotification({
      userId: senderId,
      category: "system",
      emoji: "✅",
      title: `${recipientName} accepted your friend request`,
      body: "You can see each other's gallery, files, and groups now.",
      href: `/u/${recipientId}`,
    });
    return { kind: "accepted", senderName, senderId };
  }

  // Reject
  await prisma.friendship.update({
    where: { userAId_userBId: { userAId, userBId } },
    data: { status: "rejected", decidedAt: new Date() },
  });
  return { kind: "declined", senderName };
}

export default async function FriendRespondPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const result = await processRequest(sp.token, sp.action);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      {result.kind === "accepted" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            ✅
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            You&apos;re now friends with {result.senderName}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You can both see each other&apos;s gallery, files, articles, and
            groups now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/u/${result.senderId}`}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View their profile
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Go to dashboard
            </Link>
          </div>
        </>
      )}

      {result.kind === "declined" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
            ✖
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Request from {result.senderName} declined
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            They won&apos;t be notified you declined.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          </div>
        </>
      )}

      {result.kind === "already-friends" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            You&apos;re already friends with {result.senderName}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Nothing to do here — this request was already handled.
          </p>
          <div className="mt-6">
            <Link
              href={`/u/${result.senderId}`}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View their profile
            </Link>
          </div>
        </>
      )}

      {result.kind === "no-pending" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950/40">
            ⚠️
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            No pending request
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This request was either already responded to, withdrawn, or never
            existed. The link is no longer valid.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          </div>
        </>
      )}

      {result.kind === "invalid-token" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-2xl text-red-700 dark:bg-red-950/40 dark:text-red-300">
            🔒
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Link expired or invalid
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Friend-request links are valid for 14 days. You can still accept or
            decline directly on the site.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          </div>
        </>
      )}

      {result.kind === "invalid-action" && (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-2xl text-red-700 dark:bg-red-950/40 dark:text-red-300">
            ❓
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Unknown action
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            That link didn&apos;t specify whether to accept or decline.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
