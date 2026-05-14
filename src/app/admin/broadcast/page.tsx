import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { isTelegramConfigured } from "@/lib/telegram";
import BroadcastForm from "./BroadcastForm";

export const metadata = { title: "Admin — Broadcast" };

export default async function AdminBroadcastPage() {
  await requireAdmin();
  const configured = isTelegramConfigured();
  const recent = await prisma.broadcastLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Broadcast to Telegram
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Posts go to the public MedExam Hub Telegram channel. Auto-posted QOTD
        and manual admin broadcasts both show in the log below.
      </p>

      {!configured && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Not configured yet.</strong> Add{" "}
          <code className="font-mono text-xs">TELEGRAM_BOT_TOKEN</code> and{" "}
          <code className="font-mono text-xs">TELEGRAM_CHANNEL_ID</code> to
          Vercel env vars, then redeploy. Form below will send to the channel
          once they're set.
        </div>
      )}

      <BroadcastForm disabled={!configured} />

      <h2 className="mt-10 text-base font-semibold uppercase tracking-wide text-zinc-500">
        Recent broadcasts
      </h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Nothing posted yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {recent.map((b) => (
            <li
              key={b.id}
              className={`rounded-xl border p-4 ${
                b.ok
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>
                  <span
                    className={`me-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      b.kind === "qotd_auto"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-violet-100 text-violet-800"
                    }`}
                  >
                    {b.kind === "qotd_auto" ? "Auto (QOTD)" : "Manual"}
                  </span>
                  {b.createdAt.toLocaleString()}
                </span>
                {!b.ok && (
                  <span className="text-red-700 dark:text-red-300">
                    ✗ {b.errorMessage}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {b.text.slice(0, 280)}
                {b.text.length > 280 ? "…" : ""}
              </p>
              {b.imageUrl && (
                <p className="mt-1 text-[11px] text-zinc-400 truncate">
                  🖼 {b.imageUrl}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
