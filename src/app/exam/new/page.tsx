import { requireUser } from "@/lib/auth";
import { getMonthlyQuestionsUsage, getMonthlyFileUploads } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import { prisma } from "@/lib/db";
import NewExamForm from "./NewExamForm";
import OnboardingTour from "./OnboardingTour";

export default async function NewExamPage() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);
  const planCfg = PLAN_LIMITS[user.plan];
  const planLabel = t.plans.perPlan[user.plan].label;
  const fileEnabled = planCfg.fileUploadsPerMonth > 0;

  const [usage, fileUsage, recentFiles] = await Promise.all([
    getMonthlyQuestionsUsage(user.id, user.plan),
    fileEnabled ? getMonthlyFileUploads(user.id, user.plan) : Promise.resolve(null),
    fileEnabled
      ? prisma.fileUpload.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, filename: true, charCount: true, createdAt: true, summaryUrl: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <OnboardingTour />
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.newExam.pageTitle}</h1>
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
        fileEnabled={fileEnabled}
        fileUsage={fileUsage}
        recentFiles={recentFiles.map((f) => ({
          id: f.id,
          filename: f.filename,
          charCount: f.charCount,
          createdAt: f.createdAt.toISOString(),
          summaryUrl: f.summaryUrl,
        }))}
        defaults={{
          generationMode:
            user.defaultGenerationMode === "exam"
              ? "exam"
              : user.defaultGenerationMode === "custom"
                ? "custom"
                : "specialty",
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
