"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateExam } from "@/lib/exam-generator";
import { getMonthlyQuestionsUsage, recordQuestionsUsed } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import { Difficulty, ExamMode, ExamStatus, QuestionFormat } from "@/generated/prisma/client";
import { getAllExamTypeIds, findExamType } from "@/lib/exam-types";
import { truncateForPrompt } from "@/lib/file-upload";
import { detectAndPersistAchievements } from "@/lib/achievements";
import { createNotification } from "@/lib/notifications";

const NewExamSchema = z
  .object({
    specialty: z.string().max(80).optional().or(z.literal("")),
    topic: z.string().max(120).optional().or(z.literal("")),
    examType: z.string().max(80).optional().or(z.literal("")),
    sourceFileId: z.string().max(40).optional().or(z.literal("")),
    language: z.string().max(8).optional().or(z.literal("")),
    audience: z.enum(["MEDICAL", "PARAMEDICAL", "NONMEDICAL"]).optional(),
    questionFormat: z.nativeEnum(QuestionFormat).optional(),
    // Mixed-format exam config: comma-separated `<FORMAT>:<count>` pairs,
    // e.g. "MCQ:5,TRUE_FALSE:3,SHORT_NOTES:2". The generator runs one AI
    // call per non-zero entry and concatenates the results in the canonical
    // order (MCQ → TRUE_FALSE → SHORT_NOTES). When set, this overrides
    // numQuestions (the total comes from the sum of per-format counts).
    questionCounts: z.string().max(120).optional().or(z.literal("")),
    difficulty: z.nativeEnum(Difficulty),
    mode: z.nativeEnum(ExamMode),
    numQuestions: z.coerce.number().int().min(1).max(100),
    timeLimitMin: z.coerce.number().int().min(0).max(240).optional(),
  })
  .refine(
    (d) => Boolean(d.specialty) || Boolean(d.examType) || Boolean(d.sourceFileId),
    { message: "Pick a specialty, exam type, or source file." }
  );

export type NewExamState = { error?: string } | null;

export async function createExamAction(_prev: NewExamState, formData: FormData): Promise<NewExamState> {
  const user = await requireUser();
  const parsed = NewExamSchema.safeParse({
    specialty: formData.get("specialty") ?? "",
    topic: formData.get("topic") ?? "",
    examType: formData.get("examType") ?? "",
    sourceFileId: formData.get("sourceFileId") ?? "",
    language: formData.get("language") ?? "",
    audience: formData.get("audience") || undefined,
    questionFormat: formData.get("questionFormat") || undefined,
    questionCounts: formData.get("questionCounts") ?? "",
    difficulty: formData.get("difficulty"),
    mode: formData.get("mode"),
    numQuestions: formData.get("numQuestions"),
    timeLimitMin: formData.get("timeLimitMin") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (input.examType && !getAllExamTypeIds().includes(input.examType)) {
    return { error: "Unknown exam type." };
  }

  const planCfg = PLAN_LIMITS[user.plan];
  if (input.numQuestions > planCfg.maxQuestionsPerExam) {
    return {
      error: `Your ${planCfg.label} plan allows at most ${planCfg.maxQuestionsPerExam} questions per exam.`,
    };
  }

  const usage = await getMonthlyQuestionsUsage(user.id, user.plan);
  if (input.numQuestions > usage.remaining) {
    return {
      error: `You have ${usage.remaining} of ${usage.limit} questions remaining this month on the ${planCfg.label} plan. Reduce the question count or upgrade for more.`,
    };
  }

  const examType = input.examType ? findExamType(input.examType) : null;

  // Resolve source file (paid plans only)
  let sourceFile: { id: string; filename: string; extractedText: string } | null = null;
  if (input.sourceFileId) {
    if (planCfg.fileUploadsPerMonth === 0) {
      return {
        error: "File-based exams require Pro or Premium. Upgrade to use this feature.",
      };
    }
    const f = await prisma.fileUpload.findUnique({
      where: { id: input.sourceFileId },
      select: { id: true, userId: true, filename: true, extractedText: true },
    });
    if (!f || f.userId !== user.id) {
      return { error: "Source file not found." };
    }
    sourceFile = { id: f.id, filename: f.filename, extractedText: f.extractedText };
  }

  const title = buildTitle({
    examTypeLabel: examType?.label ?? null,
    specialty: input.specialty || null,
    topic: input.topic || null,
    fileLabel: sourceFile ? `From ${sourceFile.filename}` : null,
  });

  // Parse mixed-format selection. The form sends a comma-separated list
  // of `<FORMAT>:<count>` pairs. Each non-zero entry runs as its own
  // generation; results are concatenated MCQ → TRUE_FALSE → SHORT_NOTES.
  // When only one format has count > 0 (or `questionCounts` is empty),
  // we fall back to the legacy single-format path.
  const FORMAT_ORDER: QuestionFormat[] = [
    QuestionFormat.MCQ,
    QuestionFormat.TRUE_FALSE,
    QuestionFormat.SHORT_NOTES,
  ];
  const validFormats = new Set<QuestionFormat>(FORMAT_ORDER);
  const formatBatches: { format: QuestionFormat; count: number }[] = [];
  for (const pair of (input.questionCounts ?? "").split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const [rawFormat, rawCount] = trimmed.split(":");
    const f = (rawFormat ?? "").trim();
    const c = Number((rawCount ?? "").trim());
    if (!validFormats.has(f as QuestionFormat)) continue;
    if (!Number.isInteger(c) || c <= 0) continue;
    formatBatches.push({ format: f as QuestionFormat, count: c });
  }
  // Dedupe + canonical order.
  const merged: { format: QuestionFormat; count: number }[] = [];
  for (const f of FORMAT_ORDER) {
    const sum = formatBatches
      .filter((b) => b.format === f)
      .reduce((s, b) => s + b.count, 0);
    if (sum > 0) merged.push({ format: f, count: sum });
  }
  const isMixed = merged.length > 1;
  const totalFromBatches = merged.reduce((s, b) => s + b.count, 0);
  const effectiveTotal = totalFromBatches > 0 ? totalFromBatches : input.numQuestions;
  const primaryFormat: QuestionFormat = merged[0]?.format ?? input.questionFormat ?? QuestionFormat.MCQ;

  // Re-validate the (possibly increased) total against plan + remaining quota.
  if (effectiveTotal > planCfg.maxQuestionsPerExam) {
    return {
      error: `Your ${planCfg.label} plan allows at most ${planCfg.maxQuestionsPerExam} questions per exam.`,
    };
  }
  if (effectiveTotal > usage.remaining) {
    return {
      error: `You have ${usage.remaining} of ${usage.limit} questions remaining this month on the ${planCfg.label} plan. Reduce the question count or upgrade for more.`,
    };
  }

  const exam = await prisma.exam.create({
    data: {
      userId: user.id,
      title,
      specialty: input.specialty || null,
      topic: input.topic || null,
      examType: input.examType || null,
      sourceFileId: sourceFile?.id ?? null,
      difficulty: input.difficulty,
      mode: input.mode,
      questionFormat: primaryFormat,
      formatsAllowedJson: isMixed ? JSON.stringify(merged) : null,
      status: ExamStatus.GENERATING,
      numQuestions: effectiveTotal,
      timeLimitSec: input.timeLimitMin ? input.timeLimitMin * 60 : null,
    },
  });

  // Remember the user's choices so the next /exam/new pre-fills them.
  // generationMode: "custom" when the user is on the custom tab (audience set
  // and no medical examType), "exam" when an examType is chosen, "specialty"
  // otherwise (the default medical-specialty path).
  const isCustom = !!input.audience && !input.examType && !input.sourceFileId;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultGenerationMode: isCustom
        ? "custom"
        : input.examType
          ? "exam"
          : "specialty",
      defaultSpecialty: input.specialty || null,
      defaultTopic: input.topic || null,
      defaultExamType: input.examType || null,
      defaultDifficulty: input.difficulty,
      defaultMode: input.mode,
      defaultLanguage: input.language || null,
      defaultNumQuestions: input.numQuestions,
    },
  });

  let questions;
  try {
    const trimmed = sourceFile ? truncateForPrompt(sourceFile.extractedText) : null;
    questions = await generateExam({
      specialty: input.specialty || null,
      topic: input.topic || null,
      examType: input.examType || null,
      language: input.language || null,
      sourceText: trimmed?.text ?? null,
      sourceFilename: sourceFile?.filename ?? null,
      audience: input.audience ?? "MEDICAL",
      questionFormat: primaryFormat,
      formatBatches: isMixed ? merged : undefined,
      difficulty: input.difficulty,
      numQuestions: effectiveTotal,
    });
  } catch (e) {
    // Log the full reason to Vercel for triage; the user sees a friendlier
    // message returned in the action state.
    console.error(
      "[createExamAction] generation failed",
      {
        examId: exam.id,
        primaryFormat,
        isMixed,
        merged,
        numQuestions: effectiveTotal,
      },
      e
    );
    await prisma.exam.update({
      where: { id: exam.id },
      data: { status: ExamStatus.FAILED },
    });
    const msg = e instanceof Error ? e.message : "Failed to generate exam";
    return { error: msg };
  }

  // Log if the AI still came short of the requested total after the
  // batched generator's retry + top-up. With BATCH_SIZE=10 + top-up
  // this should be vanishingly rare; if it ever shows up in the error
  // log it means OpenAI is misbehaving and we want to know.
  if (questions.length < effectiveTotal) {
    console.warn(
      `[createExamAction] shortfall: requested ${effectiveTotal}, got ${questions.length}`,
      { examId: exam.id }
    );
  }

  await prisma.$transaction([
    ...questions.map((q, i) =>
      prisma.question.create({
        data: {
          examId: exam.id,
          orderIndex: i,
          prompt: q.prompt,
          format: q.format ?? primaryFormat,
          // For SHORT_NOTES the generator returns no options/correctId, so
          // store empty fallbacks. For MCQ/TF, persist the AI output as-is.
          optionsJson: JSON.stringify(q.options ?? []),
          correctId: q.correctId ?? "",
          modelAnswer: q.modelAnswer ?? null,
          explanation: q.explanation,
          learningPoint: q.learningPoint ?? null,
        },
      })
    ),
    prisma.exam.update({
      where: { id: exam.id },
      data: { status: ExamStatus.READY, numQuestions: questions.length },
    }),
  ]);

  // Quota is consumed at generation time based on the number of questions
  // the AI actually produced (which may be slightly less than requested).
  await recordQuestionsUsed(user.id, questions.length);

  redirect(`/exam/${exam.id}`);
}

function buildTitle(parts: {
  examTypeLabel: string | null;
  specialty: string | null;
  topic: string | null;
  fileLabel?: string | null;
}): string {
  const segments = [parts.fileLabel, parts.examTypeLabel, parts.specialty, parts.topic].filter(
    Boolean
  );
  if (segments.length === 0) return "Untitled exam";
  return segments.join(" · ");
}

const SubmitSchema = z.object({
  examId: z.string().min(1),
  answersJson: z.string().min(2),
});

const AnswerMapSchema = z.record(z.string(), z.string());

export async function submitExamAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = SubmitSchema.safeParse({
    examId: formData.get("examId"),
    answersJson: formData.get("answersJson"),
  });
  if (!parsed.success) {
    redirect("/dashboard");
  }
  const { examId, answersJson } = parsed.data!;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!exam || exam.userId !== user.id) {
    redirect("/dashboard");
  }

  // Idempotency: if already completed, just go to results without re-grading or re-counting quota.
  if (exam!.status === ExamStatus.COMPLETED) {
    redirect(`/exam/${examId}/results`);
  }

  const answers = AnswerMapSchema.parse(JSON.parse(answersJson));

  const totalQuestions = exam!.questions.length;

  // Grade per-question based on each question's format. For mixed exams,
  // SHORT_NOTES questions are stored as free text (no auto-grade) while
  // MCQ / TRUE_FALSE are auto-graded against correctId. The overall score
  // is the percentage of *gradable* questions answered correctly; if every
  // question is short-notes, scorePct stays null.
  let correctCount = 0;
  let gradableCount = 0;
  const wrongQuestionIds: string[] = [];
  await prisma.$transaction(
    exam!.questions.map((q) => {
      const submitted = answers[q.id] ?? null;
      if (q.format === QuestionFormat.SHORT_NOTES) {
        return prisma.question.update({
          where: { id: q.id },
          data: { selectedText: submitted, isCorrect: null },
        });
      }
      gradableCount += 1;
      const isCorrect = submitted !== null && submitted === q.correctId;
      if (isCorrect) correctCount += 1;
      else wrongQuestionIds.push(q.id);
      return prisma.question.update({
        where: { id: q.id },
        data: { selectedId: submitted, isCorrect },
      });
    })
  );

  // Spaced repetition: every gradable wrong answer becomes a review
  // card the user can drill later in /review. skipDuplicates because
  // re-taking the same exam shouldn't reset existing schedules.
  if (wrongQuestionIds.length > 0) {
    await prisma.reviewCard.createMany({
      data: wrongQuestionIds.map((qid) => ({
        userId: user.id,
        questionId: qid,
      })),
      skipDuplicates: true,
    });
  }

  // If the exam was 100% short-notes, leave scorePct null so analytics
  // skip it and the results page renders the self-assessment view.
  const scorePct =
    gradableCount === 0
      ? null
      : totalQuestions === 0
        ? 0
        : (correctCount / gradableCount) * 100;

  // Quota was already consumed at generation time. Submission just grades
  // the answers and marks the exam complete — no further usage tracking.
  await prisma.exam.update({
    where: { id: examId },
    data: {
      status: ExamStatus.COMPLETED,
      submittedAt: new Date(),
      scorePct,
    },
  });

  // Detect any newly-unlocked achievements and create in-app notifications
  // for each. Fire-and-forget — never block the user's redirect on this.
  void (async () => {
    try {
      const fresh = await prisma.user.findUnique({
        where: { id: user.id },
        select: { achievements: true },
      });
      const newly = await detectAndPersistAchievements(user.id, fresh?.achievements ?? null);
      for (const a of newly) {
        await createNotification({
          userId: user.id,
          category: "achievement",
          title: `Achievement unlocked: ${a.title}`,
          body: a.description,
          href: "/achievements",
          emoji: a.emoji,
        });
      }
    } catch {
      // best-effort
    }

    // Shared-exam attempt: notify the creator that someone finished
    // their shared exam, with the score so they can see the leaderboard
    // shift in real time.
    try {
      if (exam!.sharedFromId && scorePct !== null) {
        const master = await prisma.exam.findUnique({
          where: { id: exam!.sharedFromId },
          select: { id: true, userId: true, title: true },
        });
        if (master) {
          const takerName = user.name?.trim() || user.email.split("@")[0];
          const scoreLabel = `${Math.round(scorePct)}%`;
          await createNotification({
            userId: master.userId,
            category: "system",
            emoji: "🏁",
            title: `${takerName} finished your shared exam — ${scoreLabel}`,
            body: `Open the leaderboard for "${master.title}" to see how everyone stacks up.`,
            href: `/exam/${master.id}/leaderboard`,
          });
        }
      }
    } catch {
      // best-effort
    }
  })();

  // If this exam was a block of a mock exam, route to the mock break /
  // next-block page instead of the regular results screen.
  if (exam!.mockExamId) {
    redirect(`/mock/${exam!.mockExamId}/break?just=${examId}`);
  }

  redirect(`/exam/${examId}/results`);
}
