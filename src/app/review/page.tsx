import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Review — MedExam Hub" };

export default async function ReviewOverviewPage() {
  const user = await requireUser();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [dueNow, dueTomorrow, total, lapsed] = await Promise.all([
    prisma.reviewCard.count({
      where: { userId: user.id, due: { lte: now } },
    }),
    prisma.reviewCard.count({
      where: { userId: user.id, due: { gt: now, lte: tomorrow } },
    }),
    prisma.reviewCard.count({ where: { userId: user.id } }),
    prisma.reviewCard.count({
      where: { userId: user.id, lapses: { gt: 0 } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">📚 Review</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Every question you got wrong is automatically saved here. Drill them
        on a spaced schedule so they actually stick.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card
          label="Due now"
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
            href="/review/session"
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
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to dashboard
        </Link>
      </div>

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
