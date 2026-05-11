"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExamStatus } from "@/generated/prisma/client";
import { getMonthlyQuestionsUsage, recordQuestionsUsed } from "@/lib/quota";

export type ShareState =
  | {
      ok: true;
      token: string;
      url: string;
      expiresAt: string | null;
      maxTakers: number | null;
      timeLimitMinutes: number | null;
    }
  | { ok: false; error: string }
  | null;

const ShareOptionsSchema = z.object({
  // ISO date string (YYYY-MM-DD) from a <input type="date">. Empty string → no expiry.
  expiresAt: z.string().max(40).optional().or(z.literal("")),
  // Empty / 0 / negative → unlimited.
  maxTakers: z.coerce.number().int().min(0).max(10_000).optional(),
  // Empty / 0 → no time limit.
  timeLimitMinutes: z.coerce.number().int().min(0).max(600).optional(),
});

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
export async function enableShareAction(
  _prev: ShareState,
  formData: FormData
): Promise<ShareState> {
  const user = await requireUser();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return { ok: false, error: "Missing exam id." };

  const parsedOpts = ShareOptionsSchema.safeParse({
    expiresAt: formData.get("expiresAt") ?? "",
    maxTakers: formData.get("maxTakers") ?? 0,
    timeLimitMinutes: formData.get("timeLimitMinutes") ?? 0,
  });
  if (!parsedOpts.success) {
    return {
      ok: false,
      error: parsedOpts.error.issues[0]?.message ?? "Invalid share options.",
    };
  }

  // Translate friendly inputs into stored shapes:
  //   "" / 0 → null (= no constraint)
  //   YYYY-MM-DD → end of that day in local server time
  let shareExpiresAt: Date | null = null;
  if (parsedOpts.data.expiresAt) {
    const parsed = new Date(parsedOpts.data.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Couldn't read the expiry date." };
    }
    // Use end-of-day so a 2026-05-20 expiry stays valid through that
    // whole day in any timezone the taker happens to be in.
    parsed.setHours(23, 59, 59, 999);
    if (parsed.getTime() <= Date.now()) {
      return { ok: false, error: "Expiry date must be in the future." };
    }
    shareExpiresAt = parsed;
  }
  const shareMaxTakers =
    parsedOpts.data.maxTakers && parsedOpts.data.maxTakers > 0
      ? parsedOpts.data.maxTakers
      : null;
  const shareTimeLimitSec =
    parsedOpts.data.timeLimitMinutes && parsedOpts.data.timeLimitMinutes > 0
      ? parsedOpts.data.timeLimitMinutes * 60
      : null;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      userId: true,
      status: true,
      shareToken: true,
      sharedFromId: true,
    },
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
          data: {
            shareToken: candidate,
            shareExpiresAt,
            shareMaxTakers,
            shareTimeLimitSec,
          },
        });
        token = candidate;
        break;
      } catch {
        continue;
      }
    }
    if (!token) return { ok: false, error: "Couldn't generate a share token. Try again." };
  } else {
    // Re-running with new options updates the gates without rotating
    // the token (links already shared keep working).
    await prisma.exam.update({
      where: { id: exam.id },
      data: { shareExpiresAt, shareMaxTakers, shareTimeLimitSec },
    });
  }

  const url = buildShareUrl(token);
  revalidatePath(`/exam/${examId}/results`);
  revalidatePath(`/exam/${examId}/leaderboard`);
  revalidatePath(`/e/${token}`);
  return {
    ok: true,
    token,
    url,
    expiresAt: shareExpiresAt ? shareExpiresAt.toISOString() : null,
    maxTakers: shareMaxTakers,
    timeLimitMinutes: shareTimeLimitSec ? shareTimeLimitSec / 60 : null,
  };
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

  // Owner-set expiry — link goes cold after the chosen date.
  if (master.shareExpiresAt && master.shareExpiresAt.getTime() < Date.now()) {
    redirect(`/e/${token}?error=expired`);
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

  // Owner-set seat cap — only the first N takers get in. Counted only
  // for fresh takers (the existing-fork branch above redirects the
  // current user before this).
  if (master.shareMaxTakers && master.shareMaxTakers > 0) {
    const taken = await prisma.exam.count({
      where: { sharedFromId: master.id },
    });
    if (taken >= master.shareMaxTakers) {
      redirect(`/e/${token}?error=full`);
    }
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
      // Per-attempt timer comes from the share-link override when set;
      // otherwise we fall back to the master's own timer.
      timeLimitSec: master.shareTimeLimitSec ?? master.timeLimitSec,
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
          // Re-use the master's image URLs verbatim — Vercel Blob URLs are
          // public so takers can fetch them directly, no copy needed.
          imageUrl: q.imageUrl,
          imageDescription: q.imageDescription,
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
