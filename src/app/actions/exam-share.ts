"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExamStatus } from "@/generated/prisma/client";
import { getMonthlyQuestionsUsage, recordQuestionsUsed } from "@/lib/quota";

export type ShareState =
  | { ok: true; token: string; url: string }
  | { ok: false; error: string }
  | null;

const TOKEN_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateShareToken(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

/**
 * Owner enables sharing on a completed exam. Idempotent — re-running
 * returns the existing token without rotating it.
 */
export async function enableShareAction(formData: FormData): Promise<ShareState> {
  const user = await requireUser();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return { ok: false, error: "Missing exam id." };

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, userId: true, status: true, shareToken: true, sharedFromId: true },
  });
  if (!exam || exam.userId !== user.id) return { ok: false, error: "Exam not found." };
  if (exam.sharedFromId) {
    return { ok: false, error: "This is a forked attempt — only the original exam can be shared." };
  }
  // Allow sharing as soon as the exam is generated (READY) — the creator
  // doesn't have to take it themselves first. GENERATING / FAILED are still
  // blocked because there are no real questions yet.
  if (exam.status === ExamStatus.GENERATING || exam.status === ExamStatus.FAILED) {
    return { ok: false, error: "Wait for the exam to finish generating before sharing." };
  }

  let token = exam.shareToken;
  if (!token) {
    // Try a few times in the (very unlikely) event of a unique-violation.
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateShareToken();
      try {
        await prisma.exam.update({
          where: { id: exam.id },
          data: { shareToken: candidate },
        });
        token = candidate;
        break;
      } catch {
        continue;
      }
    }
    if (!token) return { ok: false, error: "Couldn't generate a share token. Try again." };
  }

  const url = buildShareUrl(token);
  revalidatePath(`/exam/${examId}/results`);
  revalidatePath(`/exam/${examId}/leaderboard`);
  return { ok: true, token, url };
}

/**
 * Logged-in user starts taking a shared exam. Forks the master into a new
 * Exam owned by the taker (questions copied without selections), or
 * returns the existing fork if they've already started one. Redirects.
 */
export async function startSharedExamAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/dashboard");

  const master = await prisma.exam.findUnique({
    where: { shareToken: token },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!master || master.userId === user.id) {
    // Either bad token, or the creator clicked their own link — bounce
    // them to their leaderboard.
    if (master && master.userId === user.id) {
      redirect(`/exam/${master.id}/leaderboard`);
    }
    redirect("/dashboard");
  }

  // One attempt per user per shared exam — keeps the leaderboard fair.
  const existing = await prisma.exam.findFirst({
    where: { userId: user.id, sharedFromId: master.id },
    select: { id: true, status: true },
  });
  if (existing) {
    if (existing.status === ExamStatus.COMPLETED) {
      redirect(`/exam/${existing.id}/results`);
    }
    redirect(`/exam/${existing.id}`);
  }

  // Quota check: forks reuse pre-generated questions so they don't burn
  // Claude tokens, but they do count toward the taker's monthly question
  // budget. Without this, free / Basic users could take unlimited shared
  // exams. The per-exam plan cap (`maxQuestionsPerExam`) is intentionally
  // NOT enforced here — it's there to limit AI generation cost, and forks
  // don't generate. A free user should still be able to take their
  // friend's 30-question shared exam, as long as they have the monthly
  // quota for it.
  const usage = await getMonthlyQuestionsUsage(user.id, user.plan);
  if (master.numQuestions > usage.remaining) {
    redirect(`/e/${token}?error=quota`);
  }

  // Fresh fork. Status READY → user starts taking immediately.
  const fork = await prisma.exam.create({
    data: {
      userId: user.id,
      title: master.title,
      specialty: master.specialty,
      topic: master.topic,
      examType: master.examType,
      difficulty: master.difficulty,
      mode: master.mode,
      questionFormat: master.questionFormat,
      numQuestions: master.numQuestions,
      timeLimitSec: master.timeLimitSec,
      status: ExamStatus.READY,
      sharedFromId: master.id,
      questions: {
        create: master.questions.map((q) => ({
          orderIndex: q.orderIndex,
          prompt: q.prompt,
          optionsJson: q.optionsJson,
          correctId: q.correctId,
          explanation: q.explanation,
          learningPoint: q.learningPoint,
          modelAnswer: q.modelAnswer,
        })),
      },
    },
    select: { id: true },
  });

  // Consume the taker's monthly question quota (matches createExamAction's
  // upfront-debit pattern). recordQuestionsUsed also drains the perpetual
  // bonus pool when the user goes over their plan cap.
  await recordQuestionsUsed(user.id, master.numQuestions);

  redirect(`/exam/${fork.id}`);
}

function buildShareUrl(token: string): string {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://medexamhub.org";
  return `${base}/e/${token}`;
}
