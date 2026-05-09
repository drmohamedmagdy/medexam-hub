import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MessageThreadComposer from "./MessageThreadComposer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const label = u?.name?.trim() || u?.email.split("@")[0] || "Messages";
  return { title: `${label} — Messages` };
}

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await requireUser();
  if (userId === me.id) {
    // No self-conversations.
    notFound();
  }

  const partner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!partner) notFound();

  // Fetch the full thread between these two.
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, receiverId: partner.id },
        { senderId: partner.id, receiverId: me.id },
      ],
    },
    orderBy: { sentAt: "asc" },
    take: 500,
  });

  // Mark all incoming messages from this partner as read on view. Done
  // inline (not via the server action) because a server action would call
  // revalidatePath during page render, which Next.js 16 rejects.
  await prisma.message.updateMany({
    where: {
      senderId: partner.id,
      receiverId: me.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const partnerName = partner.name?.trim() || partner.email.split("@")[0];
  const partnerInitial = partnerName[0]?.toUpperCase() ?? "?";

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/messages"
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; All messages
      </Link>

      <header className="mt-3 flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        {partner.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white">
            {partnerInitial}
          </div>
        )}
        <div className="min-w-0">
          <Link
            href={`/u/${partner.id}`}
            className="block truncate text-base font-semibold hover:text-blue-600 dark:hover:text-cyan-400"
          >
            {partnerName}
          </Link>
          <p className="text-xs text-zinc-500">View profile →</p>
        </div>
      </header>

      <ul className="mt-4 flex flex-1 flex-col gap-2 pb-4">
        {messages.length === 0 && (
          <li className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
            No messages yet — say hi 👋
          </li>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <li
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <span
                  className={`mt-1 block text-[10px] ${
                    mine ? "text-blue-100" : "text-zinc-500 dark:text-zinc-500"
                  }`}
                >
                  {m.sentAt.toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <MessageThreadComposer receiverId={partner.id} />
    </div>
  );
}
