import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMonthlyQuestionsUsage } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import UpgradeBanner from "@/components/UpgradeBanner";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { getLocale, getTranslations } from "@/lib/i18n-server";
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
  const usage = await getMonthlyQuestionsUsage(user.id, user.plan);
  const planCfg = PLAN_LIMITS[user.plan];
  const planTr = t.plans.perPlan[user.plan];

  const exams = await prisma.exam.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, title: true, specialty: true, examType: true, difficulty: true,
      status: true, numQuestions: true, scorePct: true, createdAt: true, submittedAt: true,
    },
  });

  const completed = exams.filter((e) => e.scorePct !== null);
  const avgScore =
    completed.length === 0
      ? null
      : Math.round(completed.reduce((s, e) => s + (e.scorePct ?? 0), 0) / completed.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t.dashboard.welcome.replace("{name}", user.name ?? user.email)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <PlanBadge plan={user.plan} label={`${planTr.label} ${t.dashboard.planSuffix}`} />
            <span className="text-zinc-400" aria-hidden>·</span>
            <span>
              {user.planExpiresAt
                ? t.dashboard.activeUntil.replace("{date}", user.planExpiresAt.toLocaleDateString(locale))
                : t.dashboard.freeTrial}
            </span>
            <span className="text-zinc-400" aria-hidden>·</span>
            <Link href="/account/subscription" className="text-blue-600 hover:underline">
              {t.account.manageLink}
            </Link>
            {user.plan === "PREMIUM" && (
              <>
                <span className="text-zinc-400" aria-hidden>·</span>
                <Link href="/analytics" className="text-blue-600 hover:underline">
                  Analytics
                </Link>
              </>
            )}
          </div>
        </div>
        <Link
          href="/exam/new"
          className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto sm:py-2.5"
        >
          {t.dashboard.generateNew}
        </Link>
      </div>

      {(!user.emailVerifiedAt || justVerified) && (
        <VerifyEmailBanner email={user.email} justVerified={justVerified} />
      )}

      <UpgradeBanner
        plan={user.plan}
        copy={t.banner.perPlan[user.plan as "FREE" | "BASIC" | "PRO"]}
        dismissLabel={t.banner.dismiss}
      />

      <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-3">
        <Stat
          label={t.dashboard.examsThisMonth}
          value={`${usage.used} / ${usage.limit}`}
          hint={t.dashboard.remaining.replace("{n}", String(usage.remaining))}
        />
        <Stat
          label={t.dashboard.examsCreated}
          value={String(exams.length)}
          hint={t.dashboard.completedShort.replace("{n}", String(completed.length))}
        />
        <Stat
          label={t.dashboard.averageScore}
          value={avgScore === null ? "—" : `${avgScore}%`}
          hint={t.dashboard.acrossCompleted}
        />
      </div>

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

      <div className="mt-10 flex items-center justify-between sm:mt-12">
        <h2 className="text-lg font-semibold">{t.dashboard.recentExams}</h2>
        <Link href="/exams" className="text-sm text-blue-600 hover:underline">
          View all →
        </Link>
      </div>
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {exams.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {t.dashboard.noExams}{" "}
            <Link href="/exam/new" className="text-blue-600 hover:underline">
              {t.dashboard.generateFirst}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {exams.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/exam/${e.id}`}
                  className="flex items-start justify-between gap-3 p-4 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{e.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {[e.examType, e.specialty, e.difficulty, `${e.numQuestions} Q`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {e.createdAt.toLocaleDateString(locale)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={e.status} t={t.dashboard.status} />
                    {e.scorePct !== null && (
                      <div className="text-xs font-mono text-zinc-500">{Math.round(e.scorePct)}%</div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function PlanBadge({ plan, label }: { plan: Plan; label: string }) {
  const map: Record<Plan, string> = {
    FREE: "bg-zinc-100 text-zinc-800",
    BASIC: "bg-blue-100 text-blue-800",
    PRO: "bg-emerald-100 text-emerald-800",
    PREMIUM: "bg-amber-100 text-amber-800",
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
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{heading}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="text-blue-600">→</span>
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
    GENERATING: "bg-amber-100 text-amber-800",
    READY: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    GENERATING: t.generating, READY: t.ready, IN_PROGRESS: t.inProgress, COMPLETED: t.completed, FAILED: t.failed,
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-zinc-100 text-zinc-800"}`}>
      {labels[status] ?? status.toLowerCase()}
    </span>
  );
}
