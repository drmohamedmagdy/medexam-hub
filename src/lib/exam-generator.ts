import OpenAI from "openai";
import { z } from "zod";
import type { Difficulty } from "@/generated/prisma/client";
import { findExamType } from "@/lib/exam-types";
import { findLanguage, DEFAULT_LANGUAGE } from "@/lib/languages";

const QuestionSchema = z.object({
  prompt: z.string().min(10),
  options: z
    .array(z.object({ id: z.string().min(1).max(4), text: z.string().min(1) }))
    .min(2)
    .max(6),
  correctId: z.string().min(1),
  explanation: z.string().min(10),
  learningPoint: z.string().nullable().optional(),
});

const ExamSchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

export type Audience = "MEDICAL" | "PARAMEDICAL" | "NONMEDICAL";

export type GenerateExamInput = {
  specialty?: string | null;
  topic?: string | null;
  examType?: string | null;
  language?: string | null;
  sourceText?: string | null;
  sourceFilename?: string | null;
  audience?: Audience;
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

const JSON_SCHEMA = {
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
                id: { type: "string", description: "Single capital letter A-D (or A-E)" },
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

export async function generateExam(input: GenerateExamInput): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const examType = input.examType ? findExamType(input.examType) : null;
  const language = findLanguage(input.language ?? DEFAULT_LANGUAGE) ?? findLanguage(DEFAULT_LANGUAGE)!;
  const audience: Audience = input.audience ?? "MEDICAL";

  const personaByAudience: Record<Audience, string[]> = {
    MEDICAL: [
      "You are a medical question writer for a doctor-facing exam-prep platform.",
      "Write clinically accurate single-best-answer MCQs aligned with current major guidelines.",
      "Each question must have one unambiguously correct option and plausible distractors.",
      "Explanations must be concise but cover why the correct answer is right and why each distractor is wrong.",
      "Never invent dangerous patient-specific advice; questions are educational.",
      `Output language: ${language.promptName}. Write the question stem, all answer options, the explanation, and the learning point in ${language.promptName}. Keep universally-recognized medical drug names, eponyms, and acronyms (e.g. ECG, CT, NSTEMI, NICE, AHA) in their standard form.`,
    ],
    PARAMEDICAL: [
      "You are an expert question writer for paramedical and allied health students (nursing, pharmacy technology, medical lab science, radiography, paramedicine, dietetics, physiotherapy, dental hygiene, and similar).",
      "Write accurate single-best-answer MCQs at the level appropriate for the named field.",
      "Use scope-of-practice terminology and emphasize what the named role actually does — not full physician-level decision-making.",
      "Each question must have one unambiguously correct option and plausible distractors.",
      "Explanations must be concise but cover why the correct answer is right and why each distractor is wrong.",
      "Never invent dangerous patient-specific advice; questions are educational.",
      `Output language: ${language.promptName}. Write the question stem, all options, the explanation, and the learning point in ${language.promptName}. Keep universally-recognized clinical acronyms (ECG, CT, IV, PO) in their standard form.`,
    ],
    NONMEDICAL: [
      "You are an expert question writer for general academic and professional subjects outside the medical field — math, the natural sciences, languages, business, law, computing, the humanities, and similar.",
      "Write accurate single-best-answer MCQs that reflect the subject's standard curriculum and conventions.",
      "Each question must have one unambiguously correct option and plausible distractors.",
      "Explanations must be concise but cover why the correct answer is right and why each distractor is wrong.",
      "Never produce medical advice; medical/clinical content is out of scope for this audience.",
      `Output language: ${language.promptName}. Write the question stem, all options, the explanation, and the learning point in ${language.promptName}.`,
    ],
  };

  const system = personaByAudience[audience].join(" ");

  const lines: string[] = [];
  lines.push(`Language: ${language.promptName}`);
  if (examType) {
    lines.push(`Exam style: ${examType.label}`);
    lines.push(`Style guidance: ${examType.styleHint}`);
    lines.push(
      "Match the typical question stem length, distractor style, and clinical-reasoning depth of this exam."
    );
  }
  // For non-medical / paramedical custom exams, "specialty" carries the user-
  // entered subject/field of study (e.g. "Nursing", "Mathematics"); don't label
  // it "Specialty" because the AI biases medical otherwise.
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
    lines.push("Audience: non-medical learners — keep content within the named subject; do not introduce clinical scenarios.");
  }
  if (!examType && !input.specialty && !input.topic && !input.sourceText) {
    if (audience === "NONMEDICAL") {
      lines.push("Topic: General knowledge, mixed.");
    } else {
      lines.push("Topic: General medicine, mixed.");
    }
  }
  lines.push(`Difficulty: ${input.difficulty} — ${DIFFICULTY_GUIDANCE[input.difficulty]}`);
  lines.push(`Number of questions: ${input.numQuestions}`);
  lines.push("Format: 4 options labeled A, B, C, D. Exactly one correct answer.");
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
        schema: JSON_SCHEMA,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = ExamSchema.parse(JSON.parse(raw));

  for (const q of parsed.questions) {
    const ids = new Set(q.options.map((o) => o.id));
    if (!ids.has(q.correctId)) {
      throw new Error(`correctId "${q.correctId}" not found in options for question: ${q.prompt.slice(0, 60)}`);
    }
  }

  return parsed.questions;
}
