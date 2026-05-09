import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Messages — MedExam Hub" };

type ConvoRow = {
  partnerId: string;
  partnerName: string | null;
  partnerEmail: string;
  partnerAvatar: string | null;
  lastBody: string;
  lastAt: Date;
  unread: number;
};

export default async function MessagesInboxPage() {
  const me = await requireUser();

  // Fetch every message the user is part of, then collapse to per-partner
  // conversations in app code. Volume per user is low enough for that.
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: me.id }, { receiverId: me.id }],
    },
    orderBy: { sentAt: "desc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const byPartner = new Map<string, ConvoRow>();
  for (const m of messages) {
    const partner = m.senderId === me.id ? m.receiver : m.sender;
    if (!partner) continue;
    const existing = byPartner.get(partner.id);
    const isUnread = m.receiverId === me.id && m.readAt === null;
    if (!existing) {
      byPartner.set(partner.id, {
        partnerId: partner.id,
        partnerName: partner.name,
        partnerEmail: partner.email,
        partnerAvatar: partner.avatarUrl,
        lastBody: m.body,
        lastAt: m.sentAt,
        unread: isUnread ? 1 : 0,
      });
    } else if (isUnread) {
      existing.unread += 1;
    }
  }

  const convos = Array.from(byPartner.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Direct conversations with other MedExam Hub users.
      </p>

      {convos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No messages yet. Open someone&apos;s profile and click <strong>Send message</strong>.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {convos.map((c) => (
            <li key={c.partnerId}>
              <Link
                href={`/messages/${c.partnerId}`}
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
              >
                <Avatar
                  src={c.partnerAvatar}
                  fallback={(c.partnerName ?? c.partnerEmail)[0]?.toUpperCase() ?? "?"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">
                      {c.partnerName?.trim() || c.partnerEmail.split("@")[0]}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {c.lastAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.lastBody}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-base font-bold text-white">
      {fallback}
    </div>
  );
}
