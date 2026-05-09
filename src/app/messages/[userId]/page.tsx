import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MessageThreadClient from "./MessageThreadClient";

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
  if (userId === me.id) notFound();

  const partner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!partner) notFound();

  const initial = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, receiverId: partner.id },
        { senderId: partner.id, receiverId: me.id },
      ],
    },
    orderBy: { sentAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      body: true,
      sentAt: true,
    },
  });

  // Mark inbound from this partner as read on initial view so the bell
  // count clears even before the polling endpoint kicks in.
  await prisma.message.updateMany({
    where: { senderId: partner.id, receiverId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  const partnerName = partner.name?.trim() || partner.email.split("@")[0];
  const partnerInitial = partnerName[0]?.toUpperCase() ?? "?";

  // Serialize Date → ISO string so it crosses the server/client boundary cleanly.
  const initialMessages = initial.map((m) => ({
    ...m,
    sentAt: m.sentAt.toISOString(),
  }));

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

      <MessageThreadClient
        meId={me.id}
        partnerId={partner.id}
        initialMessages={initialMessages}
      />
    </div>
  );
}
