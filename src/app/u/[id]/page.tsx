import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { getFriendshipState } from "@/lib/friendship";
import OpenMessageButton from "./OpenMessageButton";
import FriendButtons from "./FriendButtons";
import IncomingFriendRequests from "./IncomingFriendRequests";

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

  // Stats / gallery / inbox count are loaded only when they'll be shown.
  const [completedCount, avgAgg, unreadMessages, mediaItems, groupMemberships, pendingIncomingCount] = await Promise.all([
    canSeeFull
      ? prisma.exam.count({
          where: { userId: profile.id, status: "COMPLETED", sharedFromId: null },
        })
      : Promise.resolve(0),
    canSeeFull
      ? prisma.exam.aggregate({
          where: {
            userId: profile.id,
            status: "COMPLETED",
            sharedFromId: null,
            scorePct: { not: null },
          },
          _avg: { scorePct: true },
        })
      : Promise.resolve({ _avg: { scorePct: null as number | null } }),
    isMe
      ? prisma.message.count({
          where: { receiverId: profile.id, readAt: null },
        })
      : Promise.resolve(0),
    canSeeFull
      ? prisma.profileMedia.findMany({
          where: { userId: profile.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, kind: true, url: true, mimeType: true, caption: true },
        })
      : Promise.resolve([] as Array<{
          id: string;
          kind: string;
          url: string;
          mimeType: string;
          caption: string | null;
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
  ]);

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
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Edit profile
                </Link>
                <Link
                  href="/messages"
                  className="relative inline-flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
                  Messages
                  {unreadMessages > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  href="/u"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  title="Find other users"
                >
                  🔎 Explore profiles
                </Link>
              </>
            ) : me ? (
              <>
                <OpenMessageButton userId={profile.id} />
                <FriendButtons targetUserId={profile.id} state={friendship} />
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
          request buttons above. Stats, gallery, groups all hidden. */}
      {!canSeeFull && !isPrivate && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 Stats, gallery, and groups are visible to friends only.
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
          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Exams completed"
              value={completedCount.toLocaleString()}
            />
            <Stat
              label="Average score"
              value={
                avgAgg._avg.scorePct !== null
                  ? `${Math.round(avgAgg._avg.scorePct)}%`
                  : "—"
              }
            />
            <Stat
              label="Member since"
              value={profile.createdAt.toLocaleDateString()}
            />
          </section>

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

          {mediaItems.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Gallery
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mediaItems.map((m) => (
                  <figure
                    key={m.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {m.kind === "video" ? (
                      /* eslint-disable-next-line jsx-a11y/media-has-caption */
                      <video
                        src={m.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="aspect-video w-full bg-zinc-100 object-cover dark:bg-zinc-800"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.url}
                        alt={m.caption ?? ""}
                        loading="lazy"
                        className="aspect-video w-full bg-zinc-100 object-cover dark:bg-zinc-800"
                      />
                    )}
                    {m.caption && (
                      <figcaption className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {m.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}
