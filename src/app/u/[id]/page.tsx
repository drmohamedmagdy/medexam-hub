import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import OpenMessageButton from "./OpenMessageButton";

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
      _count: { select: { exams: true } },
      profileMedia: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kind: true,
          url: true,
          mimeType: true,
          caption: true,
        },
      },
    },
  });
  if (!profile) notFound();

  const isMe = me?.id === profile.id;
  const isPrivate = !profile.profilePublic && !isMe;

  // Public stats: completed exams + average score across NON-fork exams
  // (so a user's "public stats" reflect their own work, not someone
  // else's leaderboard scores).
  const [completedCount, avgAgg] = await Promise.all([
    prisma.exam.count({
      where: { userId: profile.id, status: "COMPLETED", sharedFromId: null },
    }),
    prisma.exam.aggregate({
      where: {
        userId: profile.id,
        status: "COMPLETED",
        sharedFromId: null,
        scorePct: { not: null },
      },
      _avg: { scorePct: true },
    }),
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
            {PLAN_LIMITS[profile.plan].label} plan · joined {memberSince}
          </p>
          {isMe && (
            <p className="mt-1 text-xs text-zinc-500">{profile.email}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isMe ? (
              <Link
                href={`/u/${profile.id}/edit`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Edit profile
              </Link>
            ) : me ? (
              <OpenMessageButton userId={profile.id} />
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

      {isPrivate ? (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 This profile is private.
        </div>
      ) : (
        <>
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
              label="Total attempts"
              value={profile._count.exams.toLocaleString()}
            />
          </section>

          {profile.profileMedia.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Gallery
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.profileMedia.map((m) => (
                  <figure
                    key={m.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {m.kind === "video" ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={m.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="aspect-video w-full bg-zinc-100 object-cover dark:bg-zinc-800"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
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
