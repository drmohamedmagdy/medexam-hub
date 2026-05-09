import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Review stats — MedExam Hub" };

const DAY_MS = 24 * 60 * 60 * 1000;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function ReviewStatsPage() {
  const user = await requireUser();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  // Single broad query — small payload (one row per grade event for the
  // user) — and we slice it locally instead of running 5 aggregates.
  const [logs, totalCards, dueNow] = await Promise.all([
    prisma.reviewLog.findMany({
      where: { userId: user.id, reviewedAt: { gte: thirtyDaysAgo } },
      orderBy: { reviewedAt: "desc" },
      select: {
        id: true,
        grade: true,
        reviewedAt: true,
        card: {
          select: {
            question: { select: { exam: { select: { specialty: true } } } },
          },
        },
      },
    }),
    prisma.reviewCard.count({ where: { userId: user.id } }),
    prisma.reviewCard.count({
      where: { userId: user.id, due: { lte: now } },
    }),
  ]);

  const totalReviews = await prisma.reviewLog.count({
    where: { userId: user.id },
  });

  if (totalReviews === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/review"
          className="text-sm text-zinc-500 hover:text-blue-600"
        >
          &larr; Back to review
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">📈 Review stats</h1>
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
          You haven&apos;t reviewed any cards yet. Once you start grading,
          stats show up here.
        </p>
      </div>
    );
  }

  const byGrade = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const l of logs) {
    if (l.grade in byGrade) {
      byGrade[l.grade as keyof typeof byGrade] += 1;
    }
  }
  const last30Total = logs.length;
  const last30Pass = byGrade.good + byGrade.easy + byGrade.hard;
  const last30Acc =
    last30Total === 0 ? 0 : Math.round((last30Pass / last30Total) * 100);
  const lapseRate30 =
    last30Total === 0 ? 0 : Math.round((byGrade.again / last30Total) * 100);

  // 7-day daily counts (for a tiny bar chart).
  const last7Days: Array<{ day: string; total: number; pass: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    last7Days.push({ day: ymd(d), total: 0, pass: 0 });
  }
  const dayIdx = new Map(last7Days.map((d, i) => [d.day, i]));
  for (const l of logs) {
    if (l.reviewedAt < sevenDaysAgo) continue;
    const k = ymd(l.reviewedAt);
    const idx = dayIdx.get(k);
    if (idx === undefined) continue;
    last7Days[idx].total += 1;
    if (l.grade !== "again") last7Days[idx].pass += 1;
  }
  const maxBar = Math.max(1, ...last7Days.map((d) => d.total));

  // Specialty breakdown over the last 30 days.
  const bySpecialty = new Map<string, { total: number; pass: number }>();
  for (const l of logs) {
    const s = l.card.question.exam.specialty?.trim() || "Unspecified";
    const e = bySpecialty.get(s) ?? { total: 0, pass: 0 };
    e.total += 1;
    if (l.grade !== "again") e.pass += 1;
    bySpecialty.set(s, e);
  }
  const specialtyRows = Array.from(bySpecialty.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/review"
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Back to review
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">📈 Review stats</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Last 30 days. Cards graded Again count as a miss; Hard / Good / Easy
        all count as a pass.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Reviews (all time)" value={totalReviews.toLocaleString()} />
        <Stat label="Accuracy (30d)" value={`${last30Acc}%`} />
        <Stat label="Lapse rate (30d)" value={`${lapseRate30}%`} />
        <Stat label="Total cards" value={totalCards.toLocaleString()} />
        <Stat label="Due now" value={dueNow.toLocaleString()} />
        <Stat label="Reviews (30d)" value={last30Total.toLocaleString()} />
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Last 7 days
        </h2>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {last7Days.map((d) => {
            const passPct = d.total === 0 ? 0 : (d.pass / d.total) * 100;
            const heightPct = (d.total / maxBar) * 100;
            const label = new Date(d.day).toLocaleDateString(undefined, {
              weekday: "short",
            });
            return (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="w-full bg-emerald-400 dark:bg-emerald-600"
                    style={{ height: `${(heightPct * passPct) / 100}%` }}
                    title={`${d.pass} pass / ${d.total} total`}
                  />
                  <div
                    className="w-full bg-red-300 dark:bg-red-700"
                    style={{
                      height: `${(heightPct * (100 - passPct)) / 100}%`,
                      marginLeft: -1,
                    }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500">{label}</div>
                <div className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                  {d.total}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Green = passes (Hard/Good/Easy), red = lapses (Again). Number under
          each bar is total reviews that day.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Grade breakdown (30d)
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(["again", "hard", "good", "easy"] as const).map((g) => {
            const count = byGrade[g];
            const pct =
              last30Total === 0 ? 0 : Math.round((count / last30Total) * 100);
            const color: Record<typeof g, string> = {
              again: "bg-red-500",
              hard: "bg-amber-500",
              good: "bg-emerald-500",
              easy: "bg-blue-500",
            };
            return (
              <li key={g} className="flex items-center gap-3">
                <span className="w-14 capitalize">{g}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full ${color[g]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-20 text-end font-mono text-xs text-zinc-500">
                  {count} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {specialtyRows.length > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            By specialty (30d)
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {specialtyRows.map(([s, v]) => {
              const acc = v.total === 0 ? 0 : Math.round((v.pass / v.total) * 100);
              return (
                <li
                  key={s}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <Link
                    href={`/review?specialty=${encodeURIComponent(s)}`}
                    className="min-w-0 flex-1 truncate font-medium hover:text-blue-600 dark:hover:text-cyan-400"
                  >
                    {s}
                  </Link>
                  <span className="text-xs text-zinc-500">
                    {v.total} review{v.total === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`w-12 text-end font-mono text-xs ${
                      acc >= 75
                        ? "text-emerald-700 dark:text-emerald-400"
                        : acc >= 50
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {acc}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}
