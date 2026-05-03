"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateExam } from "@/lib/exam-generator";
import { getMonthlyExamUsage, recordExamCreated } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";
import { Difficulty, ExamMode, ExamStatus } from "@/generated/prisma/client";
import { getAllExamTypeIds, findExamType } from "@/lib/exam-types";

const NewExamSchema = z
  .object({
    specialty: z.string().max(80).optional().or(z.literal("")),
    topic: z.string().max(120).optional().or(z.literal("")),
    examType: z.string().max(80).optional().or(z.literal("")),
    language: z.string().max(8).optional().or(z.literal("")),
    difficulty: z.nativeEnum(Difficulty),
    mode: z.nativeEnum(ExamMode),
    numQuestions: z.coerce.number().int().min(1).max(100),
    timeLimitMin: z.coerce.number().int().min(0).max(240).optional(),
  })
  .refine(
    (d) => Boolean(d.specialty) || Boolean(d.examType),
    { message: "Pick a specialty or an exam type." }
  );

export type NewExamState = { error?: string } | null;

export async function createExamAction(_prev: NewExamState, formData: FormData): Promise<NewExamState> {
  const user = await requireUser();
  const parsed = NewExamSchema.safeParse({
    specialty: formData.get("specialty") ?? "",
    topic: formData.get("topic") ?? "",
    examType: formData.get("examType") ?? "",
    language: formData.get("language") ?? "",
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

  const usage = await getMonthlyExamUsage(user.id, user.plan);
  if (usage.remaining < 1) {
    return {
      error: `You have used all ${usage.limit} exams this month on the ${planCfg.label} plan. Upgrade to generate more.`,
    };
  }

  const examType = input.examType ? findExamType(input.examType) : null;
  const title = buildTitle({
    examTypeLabel: examType?.label ?? null,
    specialty: input.specialty || null,
    topic: input.topic || null,
  });

  const exam = await prisma.exam.create({
    data: {
      userId: user.id,
      title,
      specialty: input.specialty || null,
      topic: input.topic || null,
      examType: input.examType || null,
      difficulty: input.difficulty,
      mode: input.mode,
      status: ExamStatus.GENERATING,
      numQuestions: input.numQuestions,
      timeLimitSec: input.timeLimitMin ? input.timeLimitMin * 60 : null,
    },
  });

  let questions;
  try {
    questions = await generateExam({
      specialty: input.specialty || null,
      topic: input.topic || null,
      examType: input.examType || null,
      language: input.language || null,
      difficulty: input.difficulty,
      numQuestions: input.numQuestions,
    });
  } catch (e) {
    await prisma.exam.update({
      where: { id: exam.id },
      data: { status: ExamStatus.FAILED },
    });
    const msg = e instanceof Error ? e.message : "Failed to generate exam";
    return { error: msg };
  }

  await prisma.$transaction([
    ...questions.map((q, i) =>
      prisma.question.create({
        data: {
          examId: exam.id,
          orderIndex: i,
          prompt: q.prompt,
          optionsJson: JSON.stringify(q.options),
          correctId: q.correctId,
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

  await recordExamCreated(user.id);

  redirect(`/exam/${exam.id}`);
}

function buildTitle(parts: {
  examTypeLabel: string | null;
  specialty: string | null;
  topic: string | null;
}): string {
  const segments = [parts.examTypeLabel, parts.specialty, parts.topic].filter(Boolean);
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

  const answers = AnswerMapSchema.parse(JSON.parse(answersJson));

  let correctCount = 0;
  await prisma.$transaction(
    exam!.questions.map((q) => {
      const sel = answers[q.id] ?? null;
      const isCorrect = sel !== null && sel === q.correctId;
      if (isCorrect) correctCount += 1;
      return prisma.question.update({
        where: { id: q.id },
        data: { selectedId: sel, isCorrect },
      });
    })
  );

  const scorePct = exam!.questions.length === 0 ? 0 : (correctCount / exam!.questions.length) * 100;
  await prisma.exam.update({
    where: { id: examId },
    data: {
      status: ExamStatus.COMPLETED,
      submittedAt: new Date(),
      scorePct,
    },
  });

  redirect(`/exam/${examId}/results`);
}
