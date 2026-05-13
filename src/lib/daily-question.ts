import "server-only";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import type { Difficulty } from "@/generated/prisma/client";

// Question of the Day generator. Calls OpenAI once a day from the cron
// to produce a single high-yield medical MCQ, persists to DailyQuestion
// keyed by the calendar date. /qotd reads today's row; users get one
// attempt each.

const SPECIALTY_ROTATION = [
  "Cardiology",
  "Pediatrics",
  "General Surgery",
  "Internal Medicine",
  "Obstetrics & Gynaecology",
  "Neurology",
  "Endocrinology",
  "Infectious Diseases",
  "Emergency Medicine",
  "Respiratory Medicine",
  "Gastroenterology",
  "Psychiatry",
  "Dermatology",
  "Ophthalmology",
];

/** "2026-05-14" — UTC calendar day key, used to dedupe. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pick a specialty in a rotating-but-not-random way so consecutive days
 *  don't repeat. Day-of-year mod rotation length. */
function specialtyForDate(d: Date): string {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const doy = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return SPECIALTY_ROTATION[doy % SPECIALTY_ROTATION.length];
}

type GeneratedMcq = {
  specialty: string;
  difficulty: Difficulty;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  learningPoint: string;
};

async function generateOneMcq(specialty: string): Promise<GeneratedMcq> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const sys = `You are a medical exam writer. Produce ONE high-yield clinical MCQ at RESIDENT difficulty.
Output VALID JSON matching this exact schema (no markdown, no commentary):
{
  "prompt": "clinical vignette + question (string)",
  "options": [{ "id": "A", "text": "..." }, { "id": "B", "text": "..." }, { "id": "C", "text": "..." }, { "id": "D", "text": "..." }],
  "correctId": "A" | "B" | "C" | "D",
  "explanation": "why the correct option is right and others are wrong (2-4 sentences)",
  "learningPoint": "the one-line takeaway"
}
Specialty: ${specialty}. Keep prompt under 600 chars. Avoid memes, avoid 'all of the above', avoid trick questions.`;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `Generate today's Question of the Day for ${specialty}.` },
    ],
    temperature: 0.8,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<GeneratedMcq>;
  if (
    !parsed.prompt ||
    !Array.isArray(parsed.options) ||
    parsed.options.length < 2 ||
    !parsed.correctId ||
    !parsed.explanation
  ) {
    throw new Error("Generated MCQ failed validation");
  }
  return {
    specialty,
    difficulty: "RESIDENT",
    prompt: parsed.prompt,
    options: parsed.options,
    correctId: parsed.correctId,
    explanation: parsed.explanation,
    learningPoint: parsed.learningPoint ?? "",
  };
}

/** Ensure today's QOTD exists; create it if missing. Idempotent. Returns
 *  the row whether it was newly created or already there. */
export async function ensureTodaysQuestion(): Promise<{
  id: string;
  created: boolean;
}> {
  const key = todayKey();
  const existing = await prisma.dailyQuestion.findUnique({
    where: { publishDate: key },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const specialty = specialtyForDate(new Date());
  const gen = await generateOneMcq(specialty);
  const row = await prisma.dailyQuestion.create({
    data: {
      publishDate: key,
      specialty: gen.specialty,
      difficulty: gen.difficulty,
      prompt: gen.prompt,
      format: "MCQ",
      optionsJson: JSON.stringify(gen.options),
      correctId: gen.correctId,
      explanation: gen.explanation,
      learningPoint: gen.learningPoint || null,
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
}

/** Read today's question for the /qotd page. Returns null if generation
 *  hasn't happened yet (which the page surfaces as a "back tomorrow"
 *  placeholder). */
export async function getTodaysQuestion() {
  const key = todayKey();
  return prisma.dailyQuestion.findUnique({
    where: { publishDate: key },
  });
}
