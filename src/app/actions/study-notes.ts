"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export type NoteState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

const Schema = z.object({
  topic: z.string().min(2).max(200),
  specialty: z.string().max(200).optional().or(z.literal("")),
  examType: z.string().max(100).optional().or(z.literal("")),
  language: z.string().max(10).optional().or(z.literal("")),
});

const SYSTEM_PROMPT = `You are a medical education writer producing concise, exam-focused topic notes for doctors, residents, and medical students preparing for licensing exams.

Your output must be:
- Structured into clear sections with Markdown headings (## section title)
- High-yield: cover what's actually tested, not what's pretty
- Concise: short bullet points, no fluff
- Clinically accurate and aligned with current major guidelines (NICE, AHA, IDSA, etc.)
- Suitable for rapid revision the night before an exam

Standard section order when applicable:
1. **Definition / overview** — one sentence
2. **Key pathophysiology / mechanism** — 2-4 bullets
3. **Risk factors / causes** — bullet list
4. **Clinical features / presentation** — bullet list grouped by symptoms vs signs vs lab/imaging
5. **Diagnosis / investigations** — bullet list, mention gold standard
6. **Management** — stepwise (initial, definitive, complications)
7. **Pearls / what examiners love to test** — 3-5 high-yield gotchas

Skip sections that don't apply (e.g. if the topic is anatomy, focus on structure/function/clinical correlates).

Universal medical acronyms (ECG, NSTEMI, NICE, AHA, BP, HR) stay in their canonical form regardless of output language.`;

export async function createStudyNoteAction(
  _prev: NoteState,
  formData: FormData
): Promise<NoteState> {
  const user = await requireUser();
  const parsed = Schema.safeParse({
    topic: String(formData.get("topic") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim(),
    examType: String(formData.get("examType") ?? "").trim(),
    language: String(formData.get("language") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please fill in the topic.",
    };
  }

  // 10 notes/hour/user. Generous for genuine review, tight against
  // accidental run-aways that would burn OpenAI budget.
  const rl = rateLimit({
    key: `study-note:${user.id}`,
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: `Slow down — try again in ${rl.retryAfterSec}s.`,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "AI is not configured. Please email support.",
    };
  }
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const lines: string[] = [];
  lines.push(`Topic: ${parsed.data.topic}`);
  if (parsed.data.specialty) lines.push(`Specialty context: ${parsed.data.specialty}`);
  if (parsed.data.examType) {
    lines.push(
      `Exam I'm preparing for: ${parsed.data.examType}. Match the depth and style of typical ${parsed.data.examType} content.`
    );
  }
  if (parsed.data.language) {
    lines.push(
      `Output language: ${parsed.data.language}. Universal medical acronyms (ECG, NSTEMI, NICE, AHA) stay in canonical English regardless.`
    );
  }
  lines.push(
    "Write a complete revision note (~600-1000 words). Markdown only. No preamble, no closing remarks — start with the first ## section."
  );

  let content: string;
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: lines.join("\n") },
      ],
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("Empty response");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return {
      ok: false,
      error: `Couldn't generate the note: ${msg}`,
    };
  }

  const note = await prisma.studyNote.create({
    data: {
      userId: user.id,
      topic: parsed.data.topic,
      specialty: parsed.data.specialty || null,
      examType: parsed.data.examType || null,
      language: parsed.data.language || null,
      content,
    },
    select: { id: true },
  });

  redirect(`/notes/${note.id}`);
}

export async function deleteStudyNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Scoped delete — never lets a user remove someone else's note.
  await prisma.studyNote.deleteMany({ where: { id, userId: user.id } });
  redirect("/notes");
}
