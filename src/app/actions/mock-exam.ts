"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExamStatus, Difficulty, ExamMode, QuestionFormat } from "@/generated/prisma/client";
import { generateExam } from "@/lib/exam-generator";
import { findTemplate, totalQuestions, type MockTemplate, type MockBlock } from "@/lib/mock-exam-templates";
import { getMonthlyQuestionsUsage, recordQuestionsUsed } from "@/lib/quota";
import { PLAN_LIMITS } from "@/lib/plans";

/**
 * Generates a single block of a mock exam — creates the Exam row,
 * generates questions through the existing batched generator, and
 * persists them. Used both at start time (first block) and after each
 * block submit (next block).
 */
async function createBlockExam(
  userId: string,
  template: MockTemplate,
  block: MockBlock,
  blockIndex: number,
  mockExamId: string
): Promise<string> {
  const title = `${template.label} — Block ${blockIndex + 1}`;
  const exam = await prisma.exam.create({
    data: {
      userId,
      title,
      examType: template.examType,
      difficulty: Difficulty.RESIDENT,
      mode: ExamMode.EXAM, // mock = strict timer
      questionFormat: QuestionFormat.MCQ,
      status: ExamStatus.GENERATING,
      numQuestions: block.questions,
      timeLimitSec: block.timeLimitMin * 60,
      mockExamId,
      blockIndex,
    },
  });

  let questions;
  try {
    questions = await generateExam({
      specialty: null,
      topic: block.topicHint ?? null,
      examType: template.examType,
      language: null,
      sourceText: null,
      sourceFilename: null,
      audience: "MEDICAL",
      questionFormat: "MCQ",
      formatBatches: undefined,
      difficulty: "RESIDENT",
      numQuestions: block.questions,
    });
  } catch (e) {
    await prisma.exam.update({
      where: { id: exam.id },
      data: { status: ExamStatus.FAILED },
    });
    throw e;
  }

  await prisma.$transaction([
    ...questions.map((q, i) =>
      prisma.question.create({
        data: {
          examId: exam.id,
          orderIndex: i,
          prompt: q.prompt,
          format: q.format ?? QuestionFormat.MCQ,
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

  // Quota debit matches createExamAction's policy.
  await recordQuestionsUsed(userId, questions.length);

  return exam.id;
}

/**
 * Starts a new mock exam. Pre-checks plan + quota for the FULL mock
 * (all blocks combined) so a user doesn't burn quota on the first
 * block then hit a wall on the second.
 */
export async function startMockExamAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const templateId = String(formData.get("templateId") ?? "");
  const template = findTemplate(templateId);
  if (!template) redirect("/mock?error=template");

  const grandTotal = totalQuestions(template!);
  const planCfg = PLAN_LIMITS[user.plan];

  // Per-block cap is enforced as block.questions ≤ plan's maxQuestionsPerExam.
  const biggestBlock = Math.max(...template!.blocks.map((b) => b.questions));
  if (biggestBlock > planCfg.maxQuestionsPerExam) {
    redirect(
      `/mock?error=plan&max=${planCfg.maxQuestionsPerExam}&need=${biggestBlock}`
    );
  }

  const usage = await getMonthlyQuestionsUsage(user.id, user.plan);
  if (grandTotal > usage.remaining) {
    redirect(
      `/mock?error=quota&remaining=${usage.remaining}&need=${grandTotal}`
    );
  }

  const mock = await prisma.mockExam.create({
    data: {
      userId: user.id,
      templateId: template!.id,
      templateLabel: template!.label,
      status: "in_progress",
      currentBlockIndex: 0,
      startedAt: new Date(),
    },
  });

  const firstExamId = await createBlockExam(
    user.id,
    template!,
    template!.blocks[0],
    0,
    mock.id
  );

  revalidatePath("/mock");
  redirect(`/exam/${firstExamId}`);
}

/**
 * Called after a mock-exam block is graded. If more blocks remain,
 * generates the next one and routes the user to it; otherwise marks
 * the mock complete and routes to results.
 */
export async function advanceMockExamAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const mockExamId = String(formData.get("mockExamId") ?? "");
  if (!mockExamId) redirect("/mock");

  const mock = await prisma.mockExam.findUnique({
    where: { id: mockExamId },
    include: { exams: { orderBy: { blockIndex: "asc" } } },
  });
  if (!mock || mock.userId !== user.id) redirect("/mock");

  const template = findTemplate(mock!.templateId);
  if (!template) redirect(`/mock/${mock!.id}/results`);

  const blocksTaken = mock!.exams.filter((e) => e.status === "COMPLETED").length;
  if (blocksTaken >= template!.blocks.length) {
    // Already done — mark complete and route to results.
    if (mock!.status !== "completed") {
      await prisma.mockExam.update({
        where: { id: mock!.id },
        data: { status: "completed", completedAt: new Date() },
      });
    }
    redirect(`/mock/${mock!.id}/results`);
  }

  // Generate the next block.
  const nextIdx = blocksTaken;
  const nextBlock = template!.blocks[nextIdx];

  const usage = await getMonthlyQuestionsUsage(user.id, user.plan);
  if (nextBlock.questions > usage.remaining) {
    // Out of quota mid-mock — mark abandoned, surface a friendly page.
    await prisma.mockExam.update({
      where: { id: mock!.id },
      data: { status: "abandoned" },
    });
    redirect(`/mock/${mock!.id}/results?abandoned=quota`);
  }

  const nextExamId = await createBlockExam(
    user.id,
    template!,
    nextBlock,
    nextIdx,
    mock!.id
  );

  await prisma.mockExam.update({
    where: { id: mock!.id },
    data: { currentBlockIndex: nextIdx },
  });

  redirect(`/exam/${nextExamId}`);
}
