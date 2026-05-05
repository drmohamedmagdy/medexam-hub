"use client";

/**
 * Score-based encouragement banner shown above the question review on the
 * results page. Renders different copy + colors based on the score range,
 * giving the user immediate positive feedback after submitting.
 *
 * Pure CSS — no animation libraries, no extra deps.
 */
export default function ScoreCelebration({
  score,
  correct,
  total,
}: {
  score: number;
  correct: number;
  total: number;
}) {
  const tier = score >= 90 ? "excellent" : score >= 75 ? "great" : score >= 60 ? "good" : score >= 40 ? "improving" : "rough";

  const config = {
    excellent: {
      emoji: "🎉",
      title: "Outstanding!",
      message: `You scored ${score}% — top-tier work. Try a harder difficulty or a new specialty next.`,
      gradient: "from-emerald-50 to-cyan-50 dark:from-emerald-900/40 dark:to-cyan-900/40",
      border: "border-emerald-300 dark:border-emerald-700/60",
      titleColor: "text-emerald-900 dark:text-emerald-300",
    },
    great: {
      emoji: "🎯",
      title: "Great job!",
      message: `${correct} of ${total} correct. Review the misses below — that's where the gains are.`,
      gradient: "from-blue-50 to-cyan-50 dark:from-blue-900/40 dark:to-cyan-900/40",
      border: "border-blue-300 dark:border-blue-700/60",
      titleColor: "text-blue-900 dark:text-blue-300",
    },
    good: {
      emoji: "💪",
      title: "Solid effort.",
      message: `${score}% — there's room to grow. Read the explanations carefully, then retry tomorrow.`,
      gradient: "from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30",
      border: "border-amber-300 dark:border-amber-700/60",
      titleColor: "text-amber-900 dark:text-amber-300",
    },
    improving: {
      emoji: "📚",
      title: "Don't stop here.",
      message: `${score}% — every miss is a high-yield learning point. Read each explanation, then run it again at this difficulty.`,
      gradient: "from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30",
      border: "border-orange-300 dark:border-orange-700/60",
      titleColor: "text-orange-900 dark:text-orange-300",
    },
    rough: {
      emoji: "🌱",
      title: "Tough one.",
      message: `${score}% — try lowering the difficulty by one level and rebuild from there. Everyone starts somewhere.`,
      gradient: "from-zinc-50 to-blue-50 dark:from-slate-800/60 dark:to-blue-900/40",
      border: "border-zinc-300 dark:border-slate-700",
      titleColor: "text-zinc-900 dark:text-slate-200",
    },
  }[tier];

  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-2xl border bg-gradient-to-br ${config.gradient} ${config.border} p-4 sm:p-5 print:hidden`}
    >
      <span className="text-3xl sm:text-4xl" aria-hidden>{config.emoji}</span>
      <div className="min-w-0">
        <p className={`text-base font-semibold sm:text-lg ${config.titleColor}`}>{config.title}</p>
        <p className="mt-1 text-sm text-zinc-700 dark:text-slate-300">{config.message}</p>
      </div>
    </div>
  );
}
