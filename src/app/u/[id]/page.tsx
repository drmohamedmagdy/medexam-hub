import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { getFriendshipState } from "@/lib/friendship";
import OpenMessageButton from "./OpenMessageButton";
import FriendButtons from "./FriendButtons";
import IncomingFriendRequests from "./IncomingFriendRequests";
import Gallery from "./Gallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  });
  const label = u?.name?.trim() || u?.email.split("@")[0] || "Profile";
  return { title: `${label} — MedExam Hub` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();

  const profile = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      avatarUrl: true,
      bio: true,
      profilePublic: true,
      createdAt: true,
    },
  });
  if (!profile) notFound();

  const isMe = me?.id === profile.id;
  const friendship = me ? await getFriendshipState(me.id, profile.id) : "none";
  const canSeeFull = isMe || friendship === "friends";

  // Hard private profiles still show only the basics, even to friends.
  // (Friend acceptance is the trust signal; the profilePublic flag is a
  // global "discoverable" toggle. If the user turned it off, even friends
  // see the limited view.)
  const isPrivate = !profile.profilePublic && !isMe && friendship !== "friends";

  // Gallery / inbox count are loaded only when they'll be shown.
  const [
    unreadMessages,
    mediaItems,
    groupMemberships,
    pendingIncomingCount,
    articles,
    friendCount,
  ] = await Promise.all([
    isMe
      ? prisma.message.count({
          where: { receiverId: profile.id, readAt: null },
        })
      : Promise.resolve(0),
    canSeeFull
      ? prisma.profileMedia.findMany({
          where: { userId: profile.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            kind: true,
            url: true,
            mimeType: true,
            caption: true,
            originalName: true,
            sizeBytes: true,
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          kind: string;
          url: string;
          mimeType: string;
          caption: string | null;
          originalName: string | null;
          sizeBytes: number;
        }>),
    canSeeFull
      ? prisma.groupMember.findMany({
          where: { userId: profile.id, group: { isPublic: true } },
          select: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                _count: { select: { members: true } },
              },
            },
          },
          orderBy: { joinedAt: "desc" },
          take: 12,
        })
      : Promise.resolve([] as Array<{
          group: {
            id: string;
            name: string;
            description: string | null;
            _count: { members: number };
          };
        }>),
    isMe
      ? prisma.friendship.count({
          where: {
            status: "pending",
            // I'm not the requester ⇒ I'm the recipient.
            NOT: { requestedBy: profile.id },
            OR: [{ userAId: profile.id }, { userBId: profile.id }],
          },
        })
      : Promise.resolve(0),
    canSeeFull
      ? prisma.post.findMany({
          where: { authorId: profile.id, kind: "ARTICLE", groupId: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, title: true, body: true, createdAt: true, imageUrl: true },
        })
      : Promise.resolve([] as Array<{
          id: string;
          title: string | null;
          body: string;
          createdAt: Date;
          imageUrl: string | null;
        }>),
    prisma.friendship.count({
      where: {
        status: "accepted",
        OR: [{ userAId: profile.id }, { userBId: profile.id }],
      },
    }),
  ]);

  const galleryItems = mediaItems.filter(
    (m) => m.kind === "image" || m.kind === "video"
  );
  const fileItems = mediaItems.filter((m) => m.kind === "file");

  const displayName =
    profile.name?.trim() || profile.email.split("@")[0];
  const memberSince = profile.createdAt.toLocaleDateString();
  const initials = (
    profile.name?.split(/\s+/).map((n) => n[0]).slice(0, 2).join("") ||
    profile.email[0]
  ).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col items-start gap-5 sm:flex-row">
        <Avatar
          src={profile.avatarUrl}
          initials={initials}
          alt={displayName}
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            joined {memberSince}
            {canSeeFull && ` · ${PLAN_LIMITS[profile.plan].label} plan`}
          </p>
          {isMe && (
            <p className="mt-1 text-xs text-zinc-500">{profile.email}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isMe ? (
              <>
                <Link
                  href={`/u/${profile.id}/edit`}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-4"
                  aria-label="Edit profile"
                  title="Edit profile"
                >
                  <span className="sm:hidden">✏️</span>
                  <span className="hidden sm:inline">Edit profile</span>
                </Link>
                <Link
                  href={`/u/${profile.id}/content`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 sm:px-4"
                  aria-label="My content"
                  title="Manage gallery, files, and articles"
                >
                  <span aria-hidden>📁</span>
                  <span className="hidden sm:inline">My content</span>
                </Link>
                <Link
                  href={`/u/${profile.id}/friends`}
                  className="relative inline-flex items-center gap-1.5 rounded-md border border-purple-600 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300 sm:px-4"
                  aria-label={`Friends (${friendCount})`}
                  title="See your friends and pending requests"
                >
                  <span aria-hidden>👥</span>
                  <span className="hidden sm:inline">Friends ({friendCount})</span>
                  <span className="sm:hidden">{friendCount}</span>
                  {pendingIncomingCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {pendingIncomingCount > 99 ? "99+" : pendingIncomingCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/messages"
                  className="relative inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:px-4"
                  aria-label={
                    unreadMessages > 0
                      ? `Messages (${unreadMessages} unread)`
                      : "Messages"
                  }
                  title="Open inbox"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span className="hidden sm:inline">Messages</span>
                  {unreadMessages > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  href="/u"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:px-4"
                  aria-label="Explore profiles"
                  title="Find other users"
                >
                  <span aria-hidden>🔎</span>
                  <span className="hidden sm:inline">Explore profiles</span>
                </Link>
              </>
            ) : me ? (
              <>
                <OpenMessageButton userId={profile.id} />
                <FriendButtons targetUserId={profile.id} state={friendship} />
                {friendship === "friends" && (
                  <Link
                    href={`/u/${profile.id}/friends`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-purple-600 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                    title="See their friends"
                  >
                    👥 Friends ({friendCount})
                  </Link>
                )}
              </>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/u/${profile.id}`)}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign in to message
              </Link>
            )}
          </div>
        </div>
      </header>

      {isMe && pendingIncomingCount > 0 && (
        <IncomingFriendRequests userId={profile.id} />
      )}

      {/* Bio is visible to everyone (it's the user's introduction). */}
      {profile.bio && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            About
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {profile.bio}
          </p>
        </section>
      )}

      {/* Locked-out view: only name, avatar, bio, and the message / friend
          request buttons above. Gallery, files, articles, groups all hidden. */}
      {!canSeeFull && !isPrivate && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 Gallery, files, and groups are visible to friends only.
          {friendship === "request_sent" && " Your request is pending."}
          {friendship === "request_received" && " They sent you a request — see above."}
          {friendship === "none" && " Send a friend request to see more."}
        </div>
      )}

      {isPrivate && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 This profile is private.
        </div>
      )}

      {canSeeFull && (
        <>
          {groupMemberships.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Public groups
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {groupMemberships.map((m) => (
                  <li key={m.group.id}>
                    <Link
                      href={`/community/groups/${m.group.id}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
                    >
                      <div className="text-sm font-semibold">🌐 {m.group.name}</div>
                      {m.group.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {m.group.description}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {m.group._count.members} member
                        {m.group._count.members === 1 ? "" : "s"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {galleryItems.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Gallery
              </h2>
              <Gallery items={galleryItems} />
            </section>
          )}

          {fileItems.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Files
              </h2>
              <ul className="mt-3 space-y-2">
                {fileItems.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="text-2xl">
                      {fileEmojiFor(m.mimeType, m.originalName ?? "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={m.originalName ?? undefined}
                        className="block truncate text-sm font-medium hover:text-blue-600 dark:hover:text-cyan-400"
                      >
                        {m.originalName ?? "Untitled file"}
                      </a>
                      {m.caption && (
                        <p className="truncate text-xs text-zinc-500">{m.caption}</p>
                      )}
                      <p className="text-[11px] text-zinc-400">
                        {formatBytes(m.sizeBytes)}
                      </p>
                    </div>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={m.originalName ?? undefined}
                      className="shrink-0 rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {articles.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Articles
              </h2>
              <ul className="mt-3 space-y-3">
                {articles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/community/post/${a.id}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
                    >
                      <div className="flex items-start gap-3">
                        {a.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={a.imageUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-md object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">
                            📰 {a.title?.trim() || "Untitled article"}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {a.body.slice(0, 220)}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {a.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Avatar({
  src,
  initials,
  alt,
}: {
  src: string | null;
  initials: string;
  alt: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg dark:border-zinc-900 sm:h-28 sm:w-28"
      />
    );
  }
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl font-bold text-white shadow-lg sm:h-28 sm:w-28">
      {initials}
    </div>
  );
}

function fileEmojiFor(mime: string, name: string) {
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "📕";
  if (mime.includes("word") || /\.docx?$/i.test(name)) return "📄";
  if (mime.includes("presentation") || /\.pptx?$/i.test(name)) return "📊";
  if (mime.includes("sheet") || mime.includes("excel") || /\.xlsx?$/i.test(name)) return "📈";
  if (mime.startsWith("text/") || /\.(md|txt|csv)$/i.test(name)) return "📝";
  if (mime === "application/zip" || /\.zip$/i.test(name)) return "🗜️";
  return "📎";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
