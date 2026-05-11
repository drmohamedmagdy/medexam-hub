import type { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_USER_TURNS = 10;
const HISTORY_LIMIT = 40; // last 20 round-trips

const SYSTEM_PROMPT = `You are an expert medical tutor helping a student understand a specific exam question they just answered. Reference the question, options, correct answer, and explanation provided below — they are the source of truth.

Behaviour:
- Answer in 1-3 short paragraphs unless the student asks for depth.
- If the student asks "why is X correct?" or "why isn't Y correct?", explain crisply using the explanation as a base and add mechanism/pathophys.
- If they ask for similar questions or variants, write 1-3 short ones with answers below.
- If they ask for a pathophysiology / mechanism / pharmacology dive, give a tight, exam-relevant version.
- Be honest if the question's stated explanation is wrong or unclear — say so and provide the corrected answer.
- Never invent guidelines or studies you're not confident about.

Language: match the student's language. Universal medical acronyms (ECG, NSTEMI, NICE, AHA) stay in canonical English regardless.`;

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
});

async function loadContext(questionId: string, userOwnsExam: boolean) {
  if (!userOwnsExam) return null;
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      prompt: true,
      format: true,
      optionsJson: true,
      correctId: true,
      explanation: true,
      learningPoint: true,
      modelAnswer: true,
      exam: {
        select: {
          userId: true,
          specialty: true,
          examType: true,
          topic: true,
        },
      },
    },
  });
}

function questionContext(q: NonNullable<Awaited<ReturnType<typeof loadContext>>>): string {
  const lines: string[] = [];
  lines.push(`Question type: ${q.format}`);
  if (q.exam.specialty) lines.push(`Specialty: ${q.exam.specialty}`);
  if (q.exam.examType) lines.push(`Exam style: ${q.exam.examType}`);
  if (q.exam.topic) lines.push(`Topic: ${q.exam.topic}`);
  lines.push("");
  lines.push("PROMPT:");
  lines.push(q.prompt);
  lines.push("");
  try {
    const opts = JSON.parse(q.optionsJson) as Array<{ id: string; text: string }>;
    if (Array.isArray(opts) && opts.length > 0) {
      lines.push("OPTIONS:");
      for (const o of opts) {
        const marker = o.id === q.correctId ? " ← correct" : "";
        lines.push(`  ${o.id}: ${o.text}${marker}`);
      }
      lines.push("");
    }
  } catch {
    // ignore malformed options
  }
  if (q.modelAnswer) {
    lines.push("MODEL ANSWER:");
    lines.push(q.modelAnswer);
    lines.push("");
  }
  lines.push("EXPLANATION:");
  lines.push(q.explanation);
  if (q.learningPoint) {
    lines.push("");
    lines.push(`LEARNING POINT: ${q.learningPoint}`);
  }
  return lines.join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { questionId } = await params;

  const chat = await prisma.tutorChat.findUnique({
    where: { userId_questionId: { userId: me.id, questionId } },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: HISTORY_LIMIT,
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });
  if (!chat) return Response.json({ messages: [] });
  return Response.json({
    messages: chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { questionId } = await params;

  // 30 turns / hour / user. Generous for a single sit-down session,
  // tight against accidental run-aways that would burn budget.
  const rl = rateLimit({
    key: `tutor:${me.id}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }

  // Load question with ownership check. The user must own the exam
  // containing this question to chat about it.
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      prompt: true,
      format: true,
      optionsJson: true,
      correctId: true,
      explanation: true,
      learningPoint: true,
      modelAnswer: true,
      exam: {
        select: {
          userId: true,
          specialty: true,
          examType: true,
          topic: true,
        },
      },
    },
  });
  if (!question || question.exam.userId !== me.id) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  // Find or create the chat row.
  const chat = await prisma.tutorChat.upsert({
    where: { userId_questionId: { userId: me.id, questionId } },
    update: {},
    create: { userId: me.id, questionId },
  });

  // Pull recent messages to feed the model. Cap to MAX_USER_TURNS pairs
  // so prompt size stays bounded.
  const recent = await prisma.tutorMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });

  const userTurns = recent.filter((m) => m.role === "user").length;
  if (userTurns >= MAX_USER_TURNS) {
    return Response.json(
      {
        error:
          "You've hit the tutor turn limit for this question. Start a new exam or come back later.",
      },
      { status: 429 }
    );
  }

  // Persist the user's new message first so the conversation is
  // recoverable even if OpenAI fails.
  await prisma.tutorMessage.create({
    data: { chatId: chat.id, role: "user", content: parsed.data.message },
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured. Please email support." },
      { status: 500 }
    );
  }
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemMessage = `${SYSTEM_PROMPT}\n\n---\nQUESTION CONTEXT:\n${questionContext(question)}\n---`;

  let assistantText: string;
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemMessage },
        ...recent.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: parsed.data.message },
      ],
    });
    assistantText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!assistantText) throw new Error("Empty response");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return Response.json(
      { error: `Couldn't reach the tutor: ${msg}` },
      { status: 502 }
    );
  }

  const assistantMsg = await prisma.tutorMessage.create({
    data: {
      chatId: chat.id,
      role: "assistant",
      content: assistantText,
    },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  await prisma.tutorChat.update({
    where: { id: chat.id },
    data: { updatedAt: new Date() },
  });

  return Response.json({
    message: {
      id: assistantMsg.id,
      role: assistantMsg.role,
      content: assistantMsg.content,
      createdAt: assistantMsg.createdAt.toISOString(),
    },
  });
}
