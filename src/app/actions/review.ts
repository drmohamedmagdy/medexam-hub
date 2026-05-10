"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyGrade, type ReviewGrade } from "@/lib/spaced-repetition";

const GradeSchema = z.object({
  cardId: z.string().min(1).max(80),
  grade: z.enum(["again", "hard", "good", "easy"]),
  // Optional — preserves the specialty filter across the auto-advance
  // to the next card. Empty string treated the same as missing.
  specialty: z.string().max(120).optional().or(z.literal("")),
});

function nextSessionUrl(specialty: string | null | undefined): string {
  return specialty
    ? `/review/session?specialty=${encodeURIComponent(specialty)}`
    : "/review/session";
}

export async function gradeReviewCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = GradeSchema.safeParse({
    cardId: formData.get("cardId"),
    grade: formData.get("grade"),
    specialty: String(formData.get("specialty") ?? "").trim(),
  });
  // Even if validation fails, send the user back to the session so
  // they don't get stuck on a stale card. The grade just won't apply.
  if (!parsed.success) {
    redirect(nextSessionUrl(null));
  }

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
  if (!card || card.userId !== user.id) {
    redirect(nextSessionUrl(parsed.data.specialty || null));
  }

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

  await prisma.$transaction([
    prisma.reviewCard.update({
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
    }),
    prisma.reviewLog.create({
      data: {
        userId: user.id,
        cardId: card.id,
        grade: parsed.data.grade,
      },
    }),
  ]);

  revalidatePath("/review");
  revalidatePath("/review/stats");
  // Auto-advance to the next due card. The session page will pick the
  // next one (or render the "all caught up" state) on first hit.
  redirect(nextSessionUrl(parsed.data.specialty || null));
}
