import { requireUser } from "@/lib/auth";
import { getMonthlyExamUsage } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import NewExamForm from "./NewExamForm";

export default async function NewExamPage() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);
  const usage = await getMonthlyExamUsage(user.id, user.plan);
  const planCfg = PLAN_LIMITS[user.plan];
  const planLabel = t.plans.perPlan[user.plan].label;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.newExam.pageTitle}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {t.newExam.remainingLine
          .replace("{remaining}", String(usage.remaining))
          .replace("{limit}", String(usage.limit))
          .replace("{plan}", planLabel)}
      </p>
      <NewExamForm
        remaining={usage.remaining}
        maxPerExam={planCfg.maxQuestionsPerExam}
        defaultLanguage={locale}
        labels={t.newExam}
        defaults={{
          generationMode: user.defaultGenerationMode === "exam" ? "exam" : "specialty",
          specialty: user.defaultSpecialty,
          topic: user.defaultTopic,
          examType: user.defaultExamType,
          difficulty: user.defaultDifficulty,
          mode: user.defaultMode,
          language: user.defaultLanguage,
          numQuestions: user.defaultNumQuestions,
        }}
      />
    </div>
  );
}
