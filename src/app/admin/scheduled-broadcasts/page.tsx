import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin — Scheduled broadcasts" };

export default async function ScheduledBroadcastsPage() {
  await requireAdmin();

  const upcoming = await prisma.scheduledBroadcast.findMany({
    where: { sent: false },
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });
  const sent = await prisma.scheduledBroadcast.findMany({
    where: { sent: true },
    orderBy: { scheduledFor: "desc" },
    take: 30,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Scheduled Telegram broadcasts
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {upcoming.length} upcoming · {sent.length} recently sent. Cron at
        06:00, 11:00, 17:00 UTC (= 09:00, 14:00, 20:00 Cairo) drains the
        queue.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Queue empty. Re-seed via{" "}
            <code className="font-mono text-xs">
              npx tsx --env-file=.env scripts/seed-scheduled-broadcasts.ts
            </code>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((b) => (
              <BroadcastRow key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recently sent
        </h2>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sent.map((b) => (
              <BroadcastRow key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BroadcastRow({
  b,
}: {
  b: {
    id: string;
    kind: string;
    text: string;
    scheduledFor: Date;
    sent: boolean;
    sentAt: Date | null;
    errorMessage: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  };
}) {
  const failed = b.sent === false && b.errorMessage !== null;
  return (
    <li
      className={`rounded-xl border p-4 ${
        failed
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              b.kind === "question"
                ? "bg-blue-100 text-blue-800"
                : b.kind === "promo"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {b.kind === "question" ? "🩺 Question" : b.kind === "promo" ? "🎁 Promo" : "💡 Advice"}
          </span>
          <span className="text-zinc-500">
            {b.scheduledFor.toLocaleString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Cairo",
            })}{" "}
            Cairo
          </span>
        </span>
        <span
          className={`text-xs font-medium ${
            b.sent
              ? "text-emerald-700 dark:text-emerald-400"
              : failed
                ? "text-red-700 dark:text-red-300"
                : "text-zinc-500"
          }`}
        >
          {b.sent
            ? `✓ Sent ${b.sentAt?.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" })}`
            : failed
              ? `✗ ${b.errorMessage}`
              : "⏳ Pending"}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {b.text.slice(0, 320)}
        {b.text.length > 320 ? "…" : ""}
      </p>
      {b.ctaLabel && b.ctaUrl && (
        <p className="mt-2 text-[11px] text-zinc-500">
          🔘 {b.ctaLabel} → {b.ctaUrl}
        </p>
      )}
    </li>
  );
}
