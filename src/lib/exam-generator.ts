import OpenAI from "openai";
import { z } from "zod";
import type { Difficulty, QuestionFormat } from "@/generated/prisma/client";
import { findExamType } from "@/lib/exam-types";
import { findLanguage, DEFAULT_LANGUAGE } from "@/lib/languages";

// ─────────────────────────────────────────────────────────────────────────────
// Output shapes — different per QuestionFormat
// ─────────────────────────────────────────────────────────────────────────────

const McqQuestionSchema = z.object({
  prompt: z.string().min(10),
  // id max bumped from 4 to 16 so True/False can use "True" (4) and "False"
  // (5) as ids. MCQ still uses single-letter ids in practice.
  options: z
    .array(z.object({ id: z.string().min(1).max(16), text: z.string().min(1) }))
    .min(2)
    .max(6),
  correctId: z.string().min(1).max(16),
  explanation: z.string().min(10),
  learningPoint: z.string().nullable().optional(),
});

const ShortNotesQuestionSchema = z.object({
  prompt: z.string().min(10),
  modelAnswer: z.string().min(20),
  explanation: z.string().min(10),
  learningPoint: z.string().nullable().optional(),
});

export type GeneratedQuestion = {
  prompt: string;
  // The format this individual question was generated in. Set by the
  // generator so mixed-format exams can render the right input UI per
  // question.
  format: QuestionFormat;
  // MCQ + TRUE_FALSE
  options?: Array<{ id: string; text: string }>;
  correctId?: string;
  // SHORT_NOTES
  modelAnswer?: string;
  // Common
  explanation: string;
  learningPoint?: string | null;
};

export type Audience = "MEDICAL" | "PARAMEDICAL" | "NONMEDICAL";

export type GenerateExamInput = {
  specialty?: string | null;
  topic?: string | null;
  examType?: string | null;
  language?: string | null;
  sourceText?: string | null;
  sourceFilename?: string | null;
  audience?: Audience;
  questionFormat?: QuestionFormat;
  /**
   * For mixed-format exams: the full set of formats the user picked. The
   * total numQuestions is split proportionally across these and the
   * generator runs one API call per format. Falls back to a single-format
   * run when null/undefined or length === 1.
   */
  formats?: QuestionFormat[];
  difficulty: Difficulty;
  numQuestions: number;
};

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  BEGINNER: "Basic conceptual recall, suitable for first-year students.",
  STUDENT: "Pre-clinical medical student level — definitions, mechanisms, common presentations.",
  INTERN: "Internship level — common ward scenarios, first-line management, basic differentials.",
  RESIDENT: "Residency level — specialty-specific decision making, guideline-based management.",
  SPECIALIST: "Specialist level — nuanced clinical judgment, less common presentations, evidence interpretation.",
  CONSULTANT: "Consultant level — complex multi-system cases, controversies, edge cases.",
  BOARD: "Board exam level — high-yield, tricky distractors, current guideline alignment.",
};

// Generic, audience-agnostic difficulty descriptions used when audience is
// PARAMEDICAL or NONMEDICAL — the medical-specific phrasing above ("ward
// scenarios", "consultant level") doesn't apply in those contexts.
const GENERIC_DIFFICULTY_GUIDANCE: Partial<Record<Difficulty, string>> = {
  BEGINNER: "Beginner — basic recall and definitions, entry-level understanding.",
  INTERN: "Intermediate — application of concepts to typical scenarios and problems.",
  SPECIALIST: "Advanced — nuanced reasoning, less common scenarios, deeper analysis.",
  BOARD: "Expert — highest level, integrating multiple concepts, edge cases.",
};

// JSON schema for MCQ + TRUE_FALSE outputs (both use options + correctId).
const MCQ_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
              required: ["id", "text"],
            },
          },
          correctId: { type: "string", description: "Must match one option id" },
          explanation: { type: "string" },
          learningPoint: { type: ["string", "null"] },
        },
        required: ["prompt", "options", "correctId", "explanation", "learningPoint"],
      },
    },
  },
  required: ["questions"],
} as const;

// JSON schema for SHORT_NOTES — no options, just a model answer.
const SHORT_NOTES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          modelAnswer: { type: "string" },
          explanation: { type: "string" },
          learningPoint: { type: ["string", "null"] },
        },
        required: ["prompt", "modelAnswer", "explanation", "learningPoint"],
      },
    },
  },
  required: ["questions"],
} as const;

const McqExamSchema = z.object({ questions: z.array(McqQuestionSchema).min(1) });
const ShortNotesExamSchema = z.object({ questions: z.array(ShortNotesQuestionSchema).min(1) });

export async function generateExam(input: GenerateExamInput): Promise<GeneratedQuestion[]> {
  // Mixed-format exam: dispatch one generation per format with the count
  // split proportionally, then merge + interleave so the take-exam UI
  // doesn't show all the same type back-to-back.
  const formats = (input.formats ?? []).filter((f, i, arr) => arr.indexOf(f) === i);
  if (formats.length > 1) {
    const splits = splitCount(input.numQuestions, formats.length);
    const batches = await Promise.all(
      formats.map((f, i) =>
        generateSingleFormat({
          ...input,
          formats: undefined,
          questionFormat: f,
          numQuestions: splits[i],
        })
      )
    );
    return interleave(batches);
  }
  const single = formats[0] ?? input.questionFormat;
  return generateSingleFormat({ ...input, formats: undefined, questionFormat: single });
}

function splitCount(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

function interleave<T>(batches: T[][]): T[] {
  const out: T[] = [];
  const maxLen = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of batches) {
      if (i < b.length) out.push(b[i]);
    }
  }
  return out;
}

async function generateSingleFormat(
  input: GenerateExamInput
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const examType = input.examType ? findExamType(input.examType) : null;
  const language = findLanguage(input.language ?? DEFAULT_LANGUAGE) ?? findLanguage(DEFAULT_LANGUAGE)!;
  const audience: Audience = input.audience ?? "MEDICAL";
  const format: QuestionFormat = input.questionFormat ?? "MCQ";

  // Persona stays the same regardless of question format — the format-specific
  // instructions are appended to the user message instead, so we don't have a
  // 3 × 3 matrix of prompts.
  const personaByAudience: Record<Audience, string[]> = {
    MEDICAL: [
      "You are a medical question writer for a doctor-facing exam-prep platform.",
      "Write clinically accurate questions aligned with current major guidelines.",
      "Never invent dangerous patient-specific advice; questions are educational.",
      `Output language: ${language.promptName}. Write the question stem, all answer options, the explanation, and the learning point in ${language.promptName}. Keep universally-recognized medical drug names, eponyms, and acronyms (e.g. ECG, CT, NSTEMI, NICE, AHA) in their standard form.`,
    ],
    PARAMEDICAL: [
      "You are an expert question writer for paramedical and allied health students (nursing, pharmacy technology, medical lab science, radiography, paramedicine, dietetics, physiotherapy, dental hygiene, and similar).",
      "Use scope-of-practice terminology and emphasize what the named role actually does — not full physician-level decision-making.",
      "Never invent dangerous patient-specific advice; questions are educational.",
      `Output language: ${language.promptName}. Write the question stem, all options, the explanation, and the learning point in ${language.promptName}. Keep universally-recognized clinical acronyms (ECG, CT, IV, PO) in their standard form.`,
    ],
    NONMEDICAL: [
      "You are an expert question writer for general academic and professional subjects outside the medical field — math, the natural sciences, languages, business, law, computing, the humanities, and similar.",
      "Never produce medical advice; medical/clinical content is out of scope for this audience.",
      `Output language: ${language.promptName}. Write the question stem, all options, the explanation, and the learning point in ${language.promptName}.`,
    ],
  };

  const formatInstructions: Record<QuestionFormat, string[]> = {
    MCQ: [
      "Format: single-best-answer MCQs with 4 options labeled A, B, C, D.",
      "Each question must have exactly one unambiguously correct option and plausible distractors.",
      "correctId must equal the id of the right option (e.g. \"A\", \"B\", \"C\", or \"D\").",
      "Explanations must cover why the correct answer is right AND why each distractor is wrong.",
    ],
    TRUE_FALSE: [
      "Format: True/False statements.",
      "Each question must have exactly TWO options: id \"True\" with text \"True\", and id \"False\" with text \"False\".",
      "correctId must be exactly \"True\" or \"False\" (matching one of the option ids).",
      "Write the prompt as a clear declarative statement that is unambiguously either true or false.",
      "Explanations must explain why the statement is true or false in 2–3 sentences.",
    ],
    SHORT_NOTES: [
      "Format: short-answer questions requiring a 2–4 sentence written response.",
      "Provide a `modelAnswer` field — a 3–6 sentence ideal response covering the key points the user should mention.",
      "The `explanation` field provides the broader teaching context (why this matters, common pitfalls).",
      "Do NOT use options; this is open-ended.",
    ],
  };

  const system = personaByAudience[audience].join(" ");

  const lines: string[] = [];
  lines.push(`Language: ${language.promptName}`);
  if (examType) {
    lines.push(`Exam style: ${examType.label}`);
    lines.push(`Style guidance: ${examType.styleHint}`);
    lines.push("Match the typical question stem length and reasoning depth of this exam.");
  }
  if (input.specialty) {
    const label = audience === "MEDICAL" ? "Specialty focus" : "Subject / field";
    lines.push(`${label}: ${input.specialty}`);
  }
  if (input.topic) lines.push(`Topic focus: ${input.topic}`);
  if (audience === "PARAMEDICAL" && input.specialty) {
    lines.push(
      `Audience: ${input.specialty} students/professionals. Frame questions for their role and scope of practice.`
    );
  }
  if (audience === "NONMEDICAL") {
    lines.push(
      "Audience: non-medical learners — keep content within the named subject; do not introduce clinical scenarios."
    );
  }
  if (!examType && !input.specialty && !input.topic && !input.sourceText) {
    lines.push(audience === "NONMEDICAL" ? "Topic: General knowledge, mixed." : "Topic: General medicine, mixed.");
  }
  // Pick generic difficulty description for non-medical audiences so the AI
  // doesn't generate "ward scenarios" for math or law questions.
  const useGenericDifficulty = audience === "NONMEDICAL" || audience === "PARAMEDICAL";
  const guidance =
    (useGenericDifficulty && GENERIC_DIFFICULTY_GUIDANCE[input.difficulty]) ||
    DIFFICULTY_GUIDANCE[input.difficulty];
  lines.push(`Difficulty: ${input.difficulty} — ${guidance}`);
  lines.push(`Number of questions: ${input.numQuestions}`);
  lines.push(...formatInstructions[format]);

  if (input.sourceText) {
    lines.push(
      "IMPORTANT: Generate questions strictly from the source material below. Each question must test understanding of facts, mechanisms, or recommendations explicitly present in the source. Do not introduce content that is not supported by the source."
    );
    if (input.sourceFilename) {
      lines.push(`Source filename: ${input.sourceFilename}`);
    }
    lines.push("---SOURCE MATERIAL BEGIN---");
    lines.push(input.sourceText);
    lines.push("---SOURCE MATERIAL END---");
  }
  lines.push("Return JSON matching the provided schema. No prose outside the JSON.");

  const jsonSchema = format === "SHORT_NOTES" ? SHORT_NOTES_JSON_SCHEMA : MCQ_JSON_SCHEMA;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      { role: "user", content: lines.join("\n") },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ExamQuestions",
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned an invalid response. Please try again.");
  }

  if (format === "SHORT_NOTES") {
    const result = ShortNotesExamSchema.safeParse(json);
    if (!result.success) {
      throw new Error(
        "The AI's response didn't match the expected short-notes format. Please try again."
      );
    }
    return result.data.questions.map((q) => ({
      prompt: q.prompt,
      format,
      modelAnswer: q.modelAnswer,
      explanation: q.explanation,
      learningPoint: q.learningPoint ?? null,
    }));
  }

  const result = McqExamSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      "The AI's response didn't match the expected question format. Please try again."
    );
  }

  for (const q of result.data.questions) {
    const ids = new Set(q.options.map((o) => o.id));
    if (!ids.has(q.correctId)) {
      throw new Error(
        "The AI returned a question whose correct answer doesn't match any option. Please try again."
      );
    }
  }

  return result.data.questions.map((q) => ({
    prompt: q.prompt,
    format,
    options: q.options,
    correctId: q.correctId,
    explanation: q.explanation,
    learningPoint: q.learningPoint ?? null,
  }));
}
