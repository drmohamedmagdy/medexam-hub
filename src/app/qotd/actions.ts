"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Submit an answer for today's QOTD. One attempt per user per question;
// the unique compound index on DailyQuestionAttempt enforces this even
// if the user races multiple tabs.
export async function answerQotdAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dailyQuestionId = String(formData.get("dailyQuestionId") ?? "");
  const selectedId = String(formData.get("selectedId") ?? "");
  if (!dailyQuestionId || !selectedId) return;

  const q = await prisma.dailyQuestion.findUnique({
    where: { id: dailyQuestionId },
    select: { correctId: true },
  });
  if (!q) return;

  const isCorrect = selectedId === q.correctId;

  // Upsert-by-unique so a double-submit doesn't 500 — just no-ops.
  await prisma.dailyQuestionAttempt
    .create({
      data: {
        userId: user.id,
        dailyQuestionId,
        selectedId,
        isCorrect,
      },
    })
    .catch(() => {
      // Already answered; ignore.
    });

  revalidatePath("/qotd");
}
