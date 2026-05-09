import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Review — MedExam Hub" };

export default async function ReviewOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const specialtyFilter = (sp.specialty ?? "").trim() || null;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // For specialty bucketing we have to join through Question → Exam.
  // Group counts come from a manual aggregate over the cards-with-exam
  // join because Prisma's groupBy doesn't reach across relations.
  const allDueCards = await prisma.reviewCard.findMany({
    where: { userId: user.id, due: { lte: now } },
    select: {
      id: true,
      question: { select: { exam: { select: { specialty: true } } } },
    },
  });
  const specialtyBuckets = new Map<string, number>();
  for (const c of allDueCards) {
    const s = c.question.exam.specialty?.trim() || "Unspecified";
    specialtyBuckets.set(s, (specialtyBuckets.get(s) ?? 0) + 1);
  }
  const specialties = Array.from(specialtyBuckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24);

  const filterWhere = specialtyFilter
    ? {
        userId: user.id,
        question: { exam: { specialty: specialtyFilter } },
      }
    : { userId: user.id };

  const [dueNow, dueTomorrow, total, lapsed, totalReviews] = await Promise.all([
    prisma.reviewCard.count({
      where: { ...filterWhere, due: { lte: now } },
    }),
    prisma.reviewCard.count({
      where: { ...filterWhere, due: { gt: now, lte: tomorrow } },
    }),
    prisma.reviewCard.count({ where: filterWhere }),
    prisma.reviewCard.count({
      where: { ...filterWhere, lapses: { gt: 0 } },
    }),
    prisma.reviewLog.count({ where: { userId: user.id } }),
  ]);

  function sessionHref() {
    if (!specialtyFilter) return "/review/session";
    return `/review/session?specialty=${encodeURIComponent(specialtyFilter)}`;
  }

  function specialtyHref(s: string | null) {
    if (s === null) return "/review";
    return `/review?specialty=${encodeURIComponent(s)}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">📚 Review</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Every question you got wrong is automatically saved here. Drill them
        on a spaced schedule so they actually stick.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card
          label={specialtyFilter ? `Due now in ${specialtyFilter}` : "Due now"}
          value={dueNow.toLocaleString()}
          tone={dueNow > 0 ? "go" : "muted"}
        />
        <Card
          label="Due tomorrow"
          value={dueTomorrow.toLocaleString()}
          tone="muted"
        />
        <Card label="Total cards" value={total.toLocaleString()} tone="muted" />
        <Card
          label="Cards you've lapsed on"
          value={lapsed.toLocaleString()}
          tone="muted"
        />
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {dueNow > 0 ? (
          <Link
            href={sessionHref()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            ▶ Start review ({dueNow})
          </Link>
        ) : total === 0 ? (
          <Link
            href="/exam/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            ✨ Generate your first exam
          </Link>
        ) : (
          <span className="rounded-md border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            ✅ All caught up — come back when more cards are due.
          </span>
        )}
        {totalReviews > 0 && (
          <Link
            href="/review/stats"
            className="inline-flex items-center rounded-md border border-violet-600 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-300"
          >
            📈 Stats
          </Link>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to dashboard
        </Link>
      </div>

      {specialties.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Filter by specialty
            </h2>
            {specialtyFilter && (
              <Link
                href={specialtyHref(null)}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-cyan-400"
              >
                Clear filter
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={specialtyHref(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                specialtyFilter === null
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              All ({allDueCards.length})
            </Link>
            {specialties.map(([s, count]) => (
              <Link
                key={s}
                href={specialtyHref(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  specialtyFilter === s
                    ? "bg-blue-600 text-white"
                    : "border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                {s} ({count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          How it works
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Wrong MCQ / true-false answers are added to your queue automatically.</li>
          <li>You grade each card — Again / Hard / Good / Easy.</li>
          <li>The harder it was, the sooner it comes back.</li>
          <li>Easy cards drift further out so you spend time where it counts.</li>
        </ul>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "go" | "muted";
}) {
  const tones =
    tone === "go"
      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
  return (
    <div className={`rounded-2xl border p-5 ${tones}`}>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}
