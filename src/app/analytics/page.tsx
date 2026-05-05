import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAnalyticsSummary, pickStrongAreas, pickWeakAreas } from "@/lib/analytics";
import { PLAN_LIMITS } from "@/lib/plans";
import { getLocale, getTranslations } from "@/lib/i18n-server";

export const metadata = { title: "Analytics — MedExam Hub" };

const ANALYTICS_PLANS = ["PREMIUM"] as const;

export default async function AnalyticsPage() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);

  if (!ANALYTICS_PLANS.includes(user.plan as (typeof ANALYTICS_PLANS)[number])) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics — Premium only</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Detailed accuracy breakdowns and weak-area recommendations are part of the Premium plan.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/checkout/premium"
            className="rounded-full bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
          >
            Upgrade to Premium — {PLAN_LIMITS.PREMIUM.priceMonthly.toLocaleString()} {t.plans.currencyShort}/month
          </Link>
          <Link
            href="/plans"
            className="rounded-full border border-zinc-300 px-6 py-3 text-base font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Compare plans
          </Link>
        </div>
      </div>
    );
  }

  const data = await getAnalyticsSummary(user.id);

  if (data.totalCompleted === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Not enough data yet</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Complete a couple of exams and we&apos;ll show you accuracy breakdowns and weak-area recommendations.
        </p>
        <Link
          href="/exam/new"
          className="mt-8 inline-block rounded-full bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
        >
          Generate your first exam
        </Link>
      </div>
    );
  }

  const weakSpecialties = pickWeakAreas(data.bySpecialty);
  const weakExamTypes = pickWeakAreas(data.byExamType);
  const strongSpecialties = pickStrongAreas(data.bySpecialty);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to dashboard
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Analytics</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Where you&apos;re strong, where you&apos;re weak, and what to revise next.
      </p>

      {/* Headline stats */}
      <section className="mt-6 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Stat label="Exams completed" value={data.totalCompleted.toLocaleString()} hint={`${data.totalExams} total`} />
        <Stat
          label="Questions answered"
          value={data.totalQuestionsAnswered.toLocaleString()}
          hint={`${data.totalCorrect} correct`}
        />
        <Stat
          label="Overall accuracy"
          value={data.overallAccuracy === null ? "—" : `${Math.round(data.overallAccuracy)}%`}
          hint="across all completed exams"
        />
        <Stat
          label="Recent average"
          value={
            data.recentScores.length === 0
              ? "—"
              : `${Math.round(
                  data.recentScores.reduce((s, r) => s + r.score, 0) / data.recentScores.length
                )}%`
          }
          hint={`last ${data.recentScores.length} exams`}
        />
      </section>

      {/* SPECIALTY MASTERY — visual progress bars per specialty */}
      {data.bySpecialty.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Specialty mastery</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your accuracy in each specialty you&apos;ve practised, mapped to mastery tiers.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.bySpecialty.slice(0, 12).map((b) => (
              <MasteryRow
                key={`mastery-${b.key}`}
                title={b.key}
                accuracy={b.accuracy}
                questionCount={b.questionCount}
                examCount={b.examCount}
              />
            ))}
          </div>
        </section>
      )}

      {/* Weak areas + recommendations */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Where to focus</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Topics with at least 2 attempts, sorted by lowest accuracy.
        </p>
        {weakSpecialties.length === 0 && weakExamTypes.length === 0 ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            We need at least 2 completed exams in the same specialty (or exam format) before we can recommend.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weakSpecialties.map((b) => (
              <RecommendCard
                key={`spec-${b.key}`}
                title={b.key}
                subtitle="Specialty"
                accuracy={b.accuracy}
                sampleSize={b.questionCount}
                regenerateUrl={`/exam/new?specialty=${encodeURIComponent(b.key)}`}
              />
            ))}
            {weakExamTypes.map((b) => (
              <RecommendCard
                key={`exam-${b.key}`}
                title={b.key}
                subtitle="Exam format"
                accuracy={b.accuracy}
                sampleSize={b.questionCount}
                regenerateUrl={`/exam/new?examType=${encodeURIComponent(b.key)}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Strong areas (positive reinforcement) */}
      {strongSpecialties.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your strong specialties</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {strongSpecialties.map((b) => (
              <div
                key={`strong-${b.key}`}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/40"
              >
                <div className="text-sm font-medium">{b.key}</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                  {Math.round(b.accuracy)}%
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {b.questionCount} questions · {b.examCount} exams
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bar charts */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Accuracy by specialty" buckets={data.bySpecialty} maxRows={8} />
        <ChartCard title="Accuracy by exam format" buckets={data.byExamType} maxRows={8} />
        <ChartCard title="Accuracy by difficulty" buckets={data.byDifficulty} />
        <ChartCard title="Accuracy by topic" buckets={data.byTopic} maxRows={8} />
      </section>

      {/* Recent score trend */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent score trend</h2>
        <p className="mt-1 text-sm text-zinc-500">Last {data.recentScores.length} completed exams (newest on the right).</p>
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {data.recentScores.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed exams yet.</p>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-3 h-40 overflow-x-auto">
              {[...data.recentScores].reverse().map((r) => (
                <Link
                  href={`/exam/${r.id}/results`}
                  key={r.id}
                  title={`${r.title} — ${r.score}%`}
                  className="group flex min-w-[18px] flex-1 flex-col items-center justify-end sm:min-w-0"
                >
                  <span className="mb-1 text-xs font-mono text-zinc-500 opacity-0 group-hover:opacity-100">
                    {r.score}%
                  </span>
                  <div
                    className={`w-full rounded-t-md transition ${
                      r.score >= 70
                        ? "bg-emerald-500 group-hover:bg-emerald-600"
                        : r.score >= 50
                          ? "bg-amber-500 group-hover:bg-amber-600"
                          : "bg-red-500 group-hover:bg-red-600"
                    }`}
                    style={{ height: `${Math.max(2, r.score)}%` }}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">{label}</div>
      <div className="mt-2 text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

type MasteryTier = {
  label: string;
  emoji: string;
  bg: string;
  textColor: string;
};

function masteryTier(accuracy: number): MasteryTier {
  if (accuracy >= 95) return { label: "Master", emoji: "👑", bg: "from-violet-500 via-fuchsia-500 to-pink-500", textColor: "text-violet-700 dark:text-violet-300" };
  if (accuracy >= 80) return { label: "Expert", emoji: "🌟", bg: "from-emerald-500 to-teal-500", textColor: "text-emerald-700 dark:text-emerald-300" };
  if (accuracy >= 60) return { label: "Skilled", emoji: "✨", bg: "from-cyan-500 to-blue-500", textColor: "text-cyan-700 dark:text-cyan-300" };
  if (accuracy >= 30) return { label: "Apprentice", emoji: "📘", bg: "from-amber-500 to-orange-500", textColor: "text-amber-700 dark:text-amber-300" };
  return { label: "Novice", emoji: "🌱", bg: "from-zinc-400 to-zinc-500", textColor: "text-zinc-700 dark:text-zinc-300" };
}

function MasteryRow({
  title,
  accuracy,
  questionCount,
  examCount,
}: {
  title: string;
  accuracy: number;
  questionCount: number;
  examCount: number;
}) {
  const pct = Math.round(accuracy);
  const tier = masteryTier(pct);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${tier.textColor}`}>
            <span aria-hidden>{tier.emoji}</span> {tier.label}
          </div>
        </div>
        <span className="font-mono text-base font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tier.bg} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-zinc-500 dark:text-slate-400">
        {questionCount} {questionCount === 1 ? "question" : "questions"} · {examCount} {examCount === 1 ? "exam" : "exams"}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  buckets,
  maxRows = 6,
}: {
  title: string;
  buckets: { key: string; questionCount: number; accuracy: number; examCount: number }[];
  maxRows?: number;
}) {
  const visible = buckets.slice(0, maxRows);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm">
        {visible.map((b) => {
          const pct = Math.round(b.accuracy);
          const color =
            pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
          return (
            <li key={b.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{b.key}</span>
                <span className="font-mono text-xs text-zinc-500">
                  {pct}% · {b.questionCount} Q
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {buckets.length > maxRows && (
        <p className="mt-3 text-xs text-zinc-500">+{buckets.length - maxRows} more</p>
      )}
    </div>
  );
}

function RecommendCard({
  title,
  subtitle,
  accuracy,
  sampleSize,
  regenerateUrl,
}: {
  title: string;
  subtitle: string;
  accuracy: number;
  sampleSize: number;
  regenerateUrl: string;
}) {
  const pct = Math.round(accuracy);
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/40">
      <div className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
        {subtitle}
      </div>
      <div className="mt-1 text-base font-semibold">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-red-700 dark:text-red-400">{pct}%</div>
      <div className="text-xs text-zinc-500">over {sampleSize} questions</div>
      <Link
        href={regenerateUrl}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Generate new exam on this →
      </Link>
    </div>
  );
}
