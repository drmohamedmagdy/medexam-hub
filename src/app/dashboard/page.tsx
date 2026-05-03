import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMonthlyQuestionsUsage } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import UpgradeBanner from "@/components/UpgradeBanner";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import type { Plan } from "@/generated/prisma/client";

export default async function DashboardPage() {
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.dashboard.welcome.replace("{name}", user.name ?? user.email)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <PlanBadge plan={user.plan} label={`${planTr.label} ${t.dashboard.planSuffix}`} />
            <span className="text-zinc-400">·</span>
            <span>
              {user.planExpiresAt
                ? t.dashboard.activeUntil.replace("{date}", user.planExpiresAt.toLocaleDateString(locale))
                : t.dashboard.freeTrial}
            </span>
            <span className="text-zinc-400">·</span>
            <Link href="/account/subscription" className="text-blue-600 hover:underline">
              {t.account.manageLink}
            </Link>
            {user.plan === "PREMIUM" && (
              <>
                <span className="text-zinc-400">·</span>
                <Link href="/analytics" className="text-blue-600 hover:underline">
                  Analytics
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href="/exam/new"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t.dashboard.generateNew}
        </Link>
      </div>

      <UpgradeBanner
        plan={user.plan}
        copy={t.banner.perPlan[user.plan as "FREE" | "BASIC" | "PRO"]}
        dismissLabel={t.banner.dismiss}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

      <div className="mt-12 flex items-center justify-between">
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
              <li key={e.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <Link href={`/exam/${e.id}`} className="font-medium hover:text-blue-600">{e.title}</Link>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {[e.examType, e.specialty, e.difficulty, `${e.numQuestions} Q`]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {e.createdAt.toLocaleDateString(locale)}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={e.status} t={t.dashboard.status} />
                  {e.scorePct !== null && (
                    <div className="mt-1 text-xs text-zinc-500">{Math.round(e.scorePct)}%</div>
                  )}
                </div>
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
