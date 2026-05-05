import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAchievementProgress, tierColor } from "@/lib/achievements";

export const metadata = { title: "Achievements — MedExam Hub" };

export default async function AchievementsPage() {
  const user = await requireUser();
  const items = await getAchievementProgress(user.id, user.achievements);
  const unlockedCount = items.filter((i) => i.unlocked).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to dashboard
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Achievements</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
          You&apos;ve unlocked <strong>{unlockedCount}</strong> of {items.length} achievements. Keep
          going.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
          style={{ width: `${Math.round((unlockedCount / items.length) * 100)}%` }}
        />
      </div>

      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((a) => {
          const t = tierColor(a.tier);
          return (
            <div
              key={a.id}
              className={`relative overflow-hidden rounded-2xl border border-zinc-200 p-4 text-center transition dark:border-slate-800 sm:p-5 ${
                a.unlocked ? "" : "opacity-50 grayscale"
              }`}
            >
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 sm:h-20 sm:w-20 sm:text-4xl ${t.bg} ${t.ring}`}
              >
                <span aria-hidden>{a.emoji}</span>
              </div>
              <h3 className={`mt-3 text-sm font-semibold ${a.unlocked ? t.text : ""}`}>
                {a.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">
                {a.description}
              </p>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-slate-500">
                {a.tier}
              </div>
              {!a.unlocked && (
                <div className="absolute right-2 top-2 rounded-full bg-zinc-100 p-1 text-zinc-400 dark:bg-slate-800 dark:text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
