import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listNotifications, markAllRead } from "@/lib/notifications";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export const metadata = { title: "Notifications — MedExam Hub" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, 50);

  // Auto-mark everything as read on visit — visiting the inbox implies the
  // user has seen them. This keeps the bell badge in sync.
  await markAllRead(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            Achievements, reminders, and updates from MedExam Hub.
          </p>
        </div>
        {items.some((n) => n.readAt === null) && (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur">
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="text-4xl" aria-hidden>📬</div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-slate-300">
              No notifications yet. Complete an exam and we&apos;ll let you know about achievements,
              streaks, and updates here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-slate-800">
            {items.map((n) => {
              const Inner = (
                <div className="flex items-start gap-3 p-4">
                  <span className="text-2xl" aria-hidden>{n.emoji ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium leading-snug">{n.title}</span>
                      {n.readAt === null && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-cyan-900/50 dark:text-cyan-300">
                          New
                        </span>
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400 dark:text-slate-500">
                      {n.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="block transition hover:bg-zinc-50 dark:hover:bg-slate-800/50"
                    >
                      {Inner}
                    </Link>
                  ) : (
                    Inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
