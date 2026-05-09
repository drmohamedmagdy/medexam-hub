"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyGrade, type ReviewGrade } from "@/lib/spaced-repetition";

const GradeSchema = z.object({
  cardId: z.string().min(1).max(80),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export async function gradeReviewCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = GradeSchema.safeParse({
    cardId: formData.get("cardId"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) return;

  const card = await prisma.reviewCard.findUnique({
    where: { id: parsed.data.cardId },
    select: {
      id: true,
      userId: true,
      state: true,
      intervalDays: true,
      ease: true,
      reps: true,
      lapses: true,
    },
  });
  if (!card || card.userId !== user.id) return;

  const update = applyGrade(
    {
      state: card.state as "new" | "learning" | "review" | "relearning",
      intervalDays: card.intervalDays,
      ease: card.ease,
      reps: card.reps,
      lapses: card.lapses,
    },
    parsed.data.grade as ReviewGrade
  );

  await prisma.reviewCard.update({
    where: { id: card.id },
    data: {
      state: update.state,
      intervalDays: update.intervalDays,
      ease: update.ease,
      reps: update.reps,
      lapses: update.lapses,
      due: update.due,
      lastReviewedAt: update.lastReviewedAt,
    },
  });

  revalidatePath("/review");
  revalidatePath("/review/session");
}
