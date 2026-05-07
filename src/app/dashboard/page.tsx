import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMonthlyQuestionsUsage } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import { getDailyGoal, getQuestionsAnsweredToday, getStudyStreak } from "@/lib/streak";
import { getAchievementProgress, tierColor } from "@/lib/achievements";
import UpgradeBanner from "@/components/UpgradeBanner";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import WelcomeToast from "@/components/WelcomeToast";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import type { Translations } from "@/lib/i18n";
import type { Plan } from "@/generated/prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const sp = await searchParams;
  const justVerified = sp.verify === "ok";
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);
  const dx = t.dashboardExtras;

  const [usage, exams, streak, todayCount, achievementsList] = await Promise.all([
    getMonthlyQuestionsUsage(user.id, user.plan),
    prisma.exam.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, specialty: true, examType: true, difficulty: true,
        status: true, numQuestions: true, scorePct: true, createdAt: true, submittedAt: true,
      },
    }),
    getStudyStreak(user.id),
    getQuestionsAnsweredToday(user.id),
    getAchievementProgress(user.id, user.achievements),
  ]);
  const dailyGoal = getDailyGoal(user.plan);
  const dailyPct = dailyGoal === 0 ? 0 : Math.min(100, Math.round((todayCount / dailyGoal) * 100));
  const recentUnlocked = achievementsList.filter((a) => a.unlocked).slice(0, 4);
  const totalUnlocked = achievementsList.filter((a) => a.unlocked).length;

  const planCfg = PLAN_LIMITS[user.plan];
  const planTr = t.plans.perPlan[user.plan];
  const completed = exams.filter((e) => e.scorePct !== null);
  const avgScore =
    completed.length === 0
      ? null
      : Math.round(completed.reduce((s, e) => s + (e.scorePct ?? 0), 0) / completed.length);

  // Resume an in-progress exam, if there is one — featured as the primary
  // quick action so users can pick up where they left off without hunting.
  const inProgress = exams.find((e) => e.status === "IN_PROGRESS" || e.status === "READY");

  const usagePct = usage.limit === 0 ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const firstName = user.name?.split(" ")[0] ?? "";
  const greet = greeting(firstName, dx);
  const remainingToday = Math.max(0, dailyGoal - todayCount);
  const goalMsg =
    todayCount === 0
      ? dx.todaysGoalEmpty
      : todayCount < dailyGoal
        ? (remainingToday === 1 ? dx.todaysGoalRemainingOne : dx.todaysGoalRemainingMany).replace("{n}", String(remainingToday))
        : dx.todaysGoalDone;

  const reviewSub =
    avgScore !== null
      ? dx.qaReviewSub.replace("{n}", String(completed.length)).replace("{avg}", String(avgScore))
      : dx.qaReviewSubNoScore.replace("{n}", String(completed.length));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* GREETING + STREAK */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greet}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-slate-400">
            <PlanBadge plan={user.plan} label={`${planTr.label} ${t.dashboard.planSuffix}`} />
            <span className="text-zinc-400" aria-hidden>·</span>
            <span>
              {user.planExpiresAt
                ? t.dashboard.activeUntil.replace("{date}", user.planExpiresAt.toLocaleDateString(locale))
                : t.dashboard.freeTrial}
            </span>
            <span className="text-zinc-400" aria-hidden>·</span>
            <Link href="/account/subscription" className="text-blue-600 hover:underline dark:text-cyan-400">
              {t.account.manageLink}
            </Link>
          </div>
        </div>
        {streak > 0 && (
          <StreakBadge
            streak={streak}
            label={dx.streakBadge.replace("{n}", String(streak))}
            title={dx.streakBannerTitle.replace("{n}", String(streak))}
          />
        )}
      </div>

      {(!user.emailVerifiedAt || justVerified) && (
        <VerifyEmailBanner email={user.email} justVerified={justVerified} />
      )}

      <UpgradeBanner
        plan={user.plan}
        copy={t.banner.perPlan[user.plan as "FREE" | "BASIC" | "PRO"]}
        dismissLabel={t.banner.dismiss}
      />

      {/* QUICK ACTIONS — visual entry points sized for thumb-tap */}
      <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <QuickAction
          href="/exam/new"
          title={inProgress ? dx.qaStartNew : dx.qaStartFirst}
          subtitle={dx.qaRemaining.replace("{n}", String(usage.remaining))}
          accent="blue"
          icon={<IconSpark />}
          primary
        />
        {inProgress ? (
          <QuickAction
            href={`/exam/${inProgress.id}`}
            title={dx.qaResume}
            subtitle={inProgress.title}
            accent="amber"
            icon={<IconPlay />}
          />
        ) : (
          <QuickAction
            href="/exams"
            title={dx.qaReview}
            subtitle={reviewSub}
            accent="emerald"
            icon={<IconBook />}
          />
        )}
        {user.plan === "PREMIUM" ? (
          <QuickAction
            href="/analytics"
            title={dx.qaWeak}
            subtitle={dx.qaWeakSub}
            accent="violet"
            icon={<IconChart />}
          />
        ) : (
          <QuickAction
            href="/plans"
            title={dx.qaUpgrade}
            subtitle={dx.qaUpgradeSub.replace("{pct}", "50")}
            accent="violet"
            icon={<IconStar />}
          />
        )}
      </div>

      {/* PROGRESS BAR — visual representation of monthly question quota */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400">
            {t.dashboard.examsThisMonth}
          </h2>
          <span className="font-mono text-sm tabular-nums">
            <span className="text-lg font-semibold">{usage.used}</span>
            <span className="text-zinc-500"> / {usage.limit}</span>
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              usagePct >= 90
                ? "bg-gradient-to-r from-red-500 to-red-600"
                : usagePct >= 70
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-slate-400">
          {t.dashboard.remaining.replace("{n}", String(usage.remaining))}
          {usagePct >= 90 && user.plan !== "PREMIUM" && (
            <>
              {" — "}
              <Link href="/plans" className="font-medium text-blue-600 hover:underline dark:text-cyan-400">
                {dx.upgradeForMoreInline}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* DAILY GOAL — encourages daily return without nagging */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400">
            {dx.todaysGoal}
          </h2>
          <span className="font-mono text-sm tabular-nums">
            <span className={`text-lg font-semibold ${todayCount >= dailyGoal ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{todayCount}</span>
            <span className="text-zinc-500"> / {dailyGoal} {dx.todaysGoalQuestionsSuffix}</span>
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              dailyPct >= 100
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                : "bg-gradient-to-r from-violet-500 to-blue-500"
            }`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-slate-400">{goalMsg}</p>
      </div>

      {/* ACHIEVEMENTS */}
      {totalUnlocked > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{dx.achievements}</h2>
            <Link
              href="/achievements"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-400"
            >
              {dx.viewAll} → ({totalUnlocked}/{achievementsList.length})
            </Link>
          </div>
          <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
            {recentUnlocked.map((a) => {
              const tColors = tierColor(a.tier);
              return (
                <Link
                  key={a.id}
                  href="/achievements"
                  className={`flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 sm:p-4`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ring-2 ${tColors.bg} ${tColors.ring}`}
                  >
                    <span aria-hidden>{a.emoji}</span>
                  </div>
                  <div className="min-w-0">
                    <div className={`truncate text-sm font-semibold ${tColors.text}`}>{a.title}</div>
                    <div className="truncate text-[11px] uppercase tracking-wide text-zinc-400 dark:text-slate-500">{a.tier}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <PlanGuide
        plan={user.plan}
        examsCreated={exams.length}
        heading={t.dashboard.guideHeadings[user.plan]}
        tips={t.dashboard.guideTips[user.plan].map((tip) =>
          tip
            .replace("{monthlyQuestions}", String(planCfg.monthlyQuestions))
            .replace("{monthlyExams}", String(planCfg.monthlyQuestions))
            .replace("{maxQ}", String(planCfg.maxQuestionsPerExam))
            .replace("{files}", String(planCfg.fileUploadsPerMonth))
        )}
      />

      {/* RECENT EXAMS */}
      <div className="mt-10 flex items-center justify-between sm:mt-12">
        <h2 className="text-lg font-semibold">{t.dashboard.recentExams}</h2>
        {exams.length > 0 && (
          <Link href="/exams" className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-400">
            {dx.viewAll} →
          </Link>
        )}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur">
        {exams.length === 0 ? (
          <EmptyExamsState
            generateFirstLabel={t.dashboard.generateFirst}
            emptyText={dx.emptyExams}
          />
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-slate-800">
            {exams.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/exam/${e.id}`}
                  className="flex items-start justify-between gap-3 p-4 text-sm transition hover:bg-zinc-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{e.title}</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-slate-400">
                      {[e.examType, e.specialty, e.difficulty, `${e.numQuestions} Q`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400 dark:text-slate-500">
                      {e.createdAt.toLocaleDateString(locale)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={e.status} t={t.dashboard.status} />
                    {e.scorePct !== null && (
                      <ScoreBadge score={Math.round(e.scorePct)} />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* First-time visitor toast — shown once via localStorage */}
      <WelcomeToast firstName={firstName || null} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers + small UI pieces
// ─────────────────────────────────────────────────────────────────────────────

// Use UTC hour for consistency — close enough for a friendly greeting that
// doesn't depend on browser timezone resolution on the server.
function greeting(firstName: string, dx: Translations["dashboardExtras"]): string {
  const hour = new Date().getUTCHours();
  let template: string;
  if (hour >= 4 && hour < 11) template = dx.greetingMorning;
  else if (hour >= 11 && hour < 17) template = dx.greetingAfternoon;
  else if (hour >= 17 && hour < 22) template = dx.greetingEvening;
  else template = dx.greetingNight;
  return firstName
    ? template.replace("{name}", firstName)
    : template.replace(/,\s*\{name\}/u, "");
}

function StreakBadge({ streak, label, title }: { streak: number; label: string; title: string }) {
  const flame = streak >= 7 ? "🔥🔥" : "🔥";
  return (
    <div
      className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm dark:border-amber-700/60 dark:from-amber-950/60 dark:to-orange-950/60 dark:text-amber-200"
      title={title}
    >
      <span aria-hidden>{flame}</span>
      <span>{label}</span>
    </div>
  );
}

function QuickAction({
  href,
  title,
  subtitle,
  accent,
  icon,
  primary,
}: {
  href: string;
  title: string;
  subtitle: string;
  accent: "blue" | "amber" | "emerald" | "violet";
  icon: React.ReactNode;
  primary?: boolean;
}) {
  const styles: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600",
    amber: "from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600",
    emerald: "from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600",
    violet: "from-violet-500 to-fuchsia-500 dark:from-violet-600 dark:to-fuchsia-600",
  };
  const ringColor: Record<string, string> = {
    blue: "ring-blue-500/30 dark:ring-cyan-500/30",
    amber: "ring-amber-500/30",
    emerald: "ring-emerald-500/30",
    violet: "ring-violet-500/30",
  };
  return (
    <Link
      href={href}
      className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 transition active:scale-[0.99] sm:p-5 ${
        primary
          ? `border-transparent bg-gradient-to-br text-white shadow-lg ${styles[accent]} hover:shadow-xl ring-2 ${ringColor[accent]}`
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-slate-700"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          primary
            ? "bg-white/20"
            : `bg-gradient-to-br text-white ${styles[accent]}`
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-semibold ${primary ? "text-white" : ""}`}>{title}</div>
        <div
          className={`mt-0.5 truncate text-xs ${
            primary ? "text-white/80" : "text-zinc-500 dark:text-slate-400"
          }`}
        >
          {subtitle}
        </div>
      </div>
      <span className={`mt-1 shrink-0 transition group-hover:translate-x-0.5 ${primary ? "text-white/80" : "text-zinc-400"}`} aria-hidden>
        →
      </span>
    </Link>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 80
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
      : score >= 60
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
  return (
    <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${style}`}>
      {score}%
    </span>
  );
}

function EmptyExamsState({ generateFirstLabel, emptyText }: { generateFirstLabel: string; emptyText: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden>📚</div>
      <p className="mt-3 max-w-sm text-sm text-zinc-600 dark:text-slate-300">{emptyText}</p>
      <Link
        href="/exam/new"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-lg"
      >
        {generateFirstLabel} →
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline icon glyphs (no extra dependency)
// ─────────────────────────────────────────────────────────────────────────────

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M8 5l11 7-11 7V5z" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-5" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function PlanBadge({ plan, label }: { plan: Plan; label: string }) {
  const map: Record<Plan, string> = {
    FREE: "bg-zinc-100 text-zinc-800 dark:bg-slate-800 dark:text-slate-200",
    BASIC: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    PRO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    PREMIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    RESEARCHER: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[plan]}`}>{label}</span>
  );
}

function PlanGuide({
  plan, examsCreated, heading, tips,
}: { plan: Plan; examsCreated: number; heading: string; tips: string[] }) {
  if (examsCreated === 0 && plan !== "FREE") return null;
  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400">{heading}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="text-blue-600 dark:text-cyan-400">→</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: { generating: string; ready: string; inProgress: string; completed: string; failed: string };
}) {
  const styles: Record<string, string> = {
    GENERATING: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    READY: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    GENERATING: t.generating, READY: t.ready, IN_PROGRESS: t.inProgress, COMPLETED: t.completed, FAILED: t.failed,
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-zinc-100 text-zinc-800 dark:bg-slate-800 dark:text-slate-300"}`}>
      {labels[status] ?? status.toLowerCase()}
    </span>
  );
}
