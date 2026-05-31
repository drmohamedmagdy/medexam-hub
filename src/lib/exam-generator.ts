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
  // When the AI thinks the question benefits from an illustration
  // (clinical photo, ECG, anatomy diagram, lab graph etc.), it puts a
  // short visual description here. We only use this when the exam was
  // created with withImages=true.
  imageDescription: z.string().max(400).nullable().optional(),
});

const ShortNotesQuestionSchema = z.object({
  prompt: z.string().min(10),
  modelAnswer: z.string().min(20),
  explanation: z.string().min(10),
  learningPoint: z.string().nullable().optional(),
  imageDescription: z.string().max(400).nullable().optional(),
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
  // Optional — set by the AI when an illustration would meaningfully
  // help. Caller can ignore this when the exam wasn't requested with
  // images enabled.
  imageDescription?: string | null;
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
   * For mixed-format exams: explicit count per format. The generator
   * dispatches one API call per non-zero entry and concatenates the
   * results in the canonical order (MCQ → TRUE_FALSE → SHORT_NOTES) so
   * the take-exam UI groups same-format questions together. When this
   * is provided `numQuestions` is ignored.
   */
  formatBatches?: { format: QuestionFormat; count: number }[];
  difficulty: Difficulty;
  numQuestions: number;
  /**
   * When true, ask the AI to fill in imageDescription on questions
   * that would meaningfully benefit from an illustration. Caller
   * generates the actual image afterwards using that description.
   */
  withImages?: boolean;
};

const FORMAT_ORDER: QuestionFormat[] = ["MCQ", "TRUE_FALSE", "SHORT_NOTES"];

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  BEGINNER: "Basic conceptual recall, suitable for first-year students.",
  STUDENT: "Pre-clinical medical student level — definitions, mechanisms, common presentations.",
  INTERN: "Internship level — common ward scenarios, first-line management, basic differentials.",
  RESIDENT: "Residency level — specialty-specific decision making, guideline-based management.",
  SPECIALIST:
    "Specialist level — nuanced clinical judgment, less common presentations, evidence interpretation. " +
    "Questions should require integrating 2+ pieces of clinical information; the answer should not be obvious from a single sentence in the stem.",
  CONSULTANT:
    "Consultant level — complex multi-system cases, controversies, edge cases, and failure-of-first-line scenarios. " +
    "Each question must demand long-term clinical reasoning — diagnosing despite atypical features, choosing the next step when the obvious one is wrong, or recognising the rare complication of a common drug or procedure.",
  BOARD:
    "Board exam level — the hardest possible standardised-exam questions. " +
    "Stems should be long clinical vignettes (3–6 sentences) with red-herring information; correct answers should require multi-step reasoning, not pattern matching. " +
    "Distractors must be plausible — each should be the correct answer to a slightly different version of the same scenario. " +
    "Aim for the difficulty of USMLE Step 3 / MRCP Part 2 / Egyptian Board final-exam questions.",
};

// Generic, audience-agnostic difficulty descriptions used when audience is
// PARAMEDICAL or NONMEDICAL — the medical-specific phrasing above ("ward
// scenarios", "consultant level") doesn't apply in those contexts.
const GENERIC_DIFFICULTY_GUIDANCE: Partial<Record<Difficulty, string>> = {
  BEGINNER: "Beginner — basic recall and definitions, entry-level understanding.",
  INTERN: "Intermediate — application of concepts to typical scenarios and problems.",
  SPECIALIST:
    "Advanced — nuanced reasoning, less common scenarios, deeper analysis. " +
    "Questions should require integrating multiple concepts; obvious surface-level recall is not enough.",
  BOARD:
    "Expert — the hardest difficulty. Questions should demand multi-step reasoning, " +
    "integrate concepts from several sub-topics, and include distractors that test common misconceptions. " +
    "Avoid one-step recall — every question must genuinely challenge an advanced learner.",
};

// Difficulties that get the expert-level amplifier block appended to the
// prompt. The base DIFFICULTY_GUIDANCE line is a one-liner; this block
// gives the model a long, explicit set of constructive constraints so it
// actually writes hard questions instead of just labelling easy ones as
// "expert".
const EXPERT_LEVEL_DIFFICULTIES: ReadonlySet<Difficulty> = new Set([
  "SPECIALIST",
  "CONSULTANT",
  "BOARD",
]);

const EXPERT_AMPLIFIER_MEDICAL = [
  "EXPERT-LEVEL MANDATE — every question must satisfy ALL of the following:",
  "1. STEM LENGTH: 3–6 sentences of clinical vignette. Include realistic patient context (age, sex, chronic conditions, medications, recent events) — not a one-line factoid.",
  "2. NO PATTERN-MATCHING: the answer must NOT be deducible from a single keyword in the stem. The reader should have to integrate at least two clinical findings (e.g. lab + imaging, history + exam, drug + comorbidity) before arriving at the correct option.",
  "3. NEAR-MISS DISTRACTORS: every incorrect option must be the *correct* answer to a slightly different version of the same scenario. Avoid obviously wrong options. The reader should be torn between at least 2 plausible choices.",
  "4. CHALLENGE TYPES — favour the following over simple recall:",
  "   • Atypical presentation of a common disease, or typical presentation of an uncommon one.",
  "   • \"Next best step\" sequencing where order matters (diagnose first vs treat empirically vs refer).",
  "   • Drug-interaction / contraindication / dose-adjustment scenarios (renal/hepatic impairment, pregnancy).",
  "   • Complications of complications (e.g. AKI on chronic CKD after contrast on a patient on metformin).",
  "   • Recognising failure of first-line therapy and choosing the second-line with reason.",
  "   • Lab pattern recognition with overlapping conditions (e.g. mixed acid-base disorders).",
  "   • Recent guideline updates that contradict older practice (cite the year of the guideline in the explanation).",
  "5. ANTI-PATTERNS — DO NOT write any of these:",
  "   • One-sentence definition questions (\"What is the most common cause of X?\").",
  "   • Questions where one option is clearly absurd or off-topic.",
  "   • Questions where the stem already contains the keyword that matches the answer.",
  "   • Questions a 3rd-year medical student could answer from memorisation alone.",
  "6. EXPLANATION: justify why the correct answer is right AND why each near-miss distractor is *almost* right — what one detail in the stem rules it out.",
  "If a question doesn't meet ALL six criteria, do not include it — write a harder replacement instead.",
];

const EXPERT_AMPLIFIER_GENERIC = [
  "EXPERT-LEVEL MANDATE — every question must satisfy ALL of the following:",
  "1. The stem must require integrating at least two concepts or pieces of information; one-step recall is forbidden.",
  "2. Every distractor must be the correct answer to a slightly altered version of the question — no obviously wrong options.",
  "3. Favour: edge cases, exceptions to general rules, counterintuitive results, application of theory to novel scenarios, problems where naïve intuition gives the wrong answer.",
  "4. The reader should have to think for 30+ seconds and consider 2–3 options seriously before answering.",
  "5. Explanation: justify the correct answer AND explain what makes each distractor tempting but ultimately wrong.",
  "If a question doesn't demand genuine long-term thinking, do not include it — write a harder replacement.",
];

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
          imageDescription: {
            type: ["string", "null"],
            description:
              "If an illustration would meaningfully help (clinical photo, ECG, anatomy diagram, lab graph etc.), a short ≤200-char visual description. Otherwise null.",
          },
        },
        required: ["prompt", "options", "correctId", "explanation", "learningPoint", "imageDescription"],
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
          imageDescription: {
            type: ["string", "null"],
            description:
              "If an illustration would meaningfully help, a short ≤200-char visual description. Otherwise null.",
          },
        },
        required: ["prompt", "modelAnswer", "explanation", "learningPoint", "imageDescription"],
      },
    },
  },
  required: ["questions"],
} as const;

const McqExamSchema = z.object({ questions: z.array(McqQuestionSchema).min(1) });
const ShortNotesExamSchema = z.object({ questions: z.array(ShortNotesQuestionSchema).min(1) });

// GPT-4o-mini reliably returns exactly N questions when N ≤ ~10, and
// starts dropping one (or rarely two) at higher counts. Splitting a
// 20-question request into 2 parallel batches of 10 both halves the
// wall-clock time AND fixes the off-by-one delivery issue.
const BATCH_SIZE = 10;

function splitCount(n: number, max: number): number[] {
  if (n <= 0) return [];
  if (n <= max) return [n];
  const batches: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    const chunk = Math.min(max, remaining);
    batches.push(chunk);
    remaining -= chunk;
  }
  // Balance the last batch so we don't get e.g. [10, 10, 1] — prefer
  // [7, 7, 7] for 21. Smaller, more even chunks reliably deliver.
  const total = n;
  const k = batches.length;
  const even = Math.ceil(total / k);
  if (even <= max) {
    const out: number[] = [];
    let left = total;
    for (let i = 0; i < k; i++) {
      const c = i === k - 1 ? left : Math.min(even, left);
      out.push(c);
      left -= c;
    }
    return out;
  }
  return batches;
}

/**
 * Single-format generation that splits large requests into parallel
 * sub-batches and tops up any shortfall. The single OpenAI call inside
 * `generateSingleFormat` is the bottleneck on time AND the source of
 * "asked for 20, got 19" drops — capping each call at BATCH_SIZE
 * questions makes both behave.
 */
async function generateSingleFormatBatched(
  input: GenerateExamInput
): Promise<GeneratedQuestion[]> {
  const target = input.numQuestions;
  if (target <= BATCH_SIZE) {
    return generateSingleFormat(input);
  }

  const counts = splitCount(target, BATCH_SIZE);
  const results = await Promise.all(
    counts.map(async (count) => {
      try {
        return await generateSingleFormat({ ...input, numQuestions: count });
      } catch (err) {
        // Single retry per batch — the same retry-once policy as the
        // mixed-format path.
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(
          `[exam-generator] sub-batch of ${count} failed once (${reason}); retrying`
        );
        return generateSingleFormat({ ...input, numQuestions: count });
      }
    })
  );

  let combined = results.flat();

  // Top-up if total still short — happens occasionally when one batch
  // returns N-1. One small follow-up call closes the gap.
  if (combined.length < target) {
    const missing = target - combined.length;
    try {
      const topup = await generateSingleFormat({
        ...input,
        numQuestions: missing,
      });
      combined = combined.concat(topup);
      // Dedupe by trimmed prompt in case the top-up regenerated an
      // already-seen question. Rare with the temperature we use, but
      // cheap to guard against.
      const seen = new Set<string>();
      const deduped: GeneratedQuestion[] = [];
      for (const q of combined) {
        const key = q.prompt.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(q);
      }
      combined = deduped;
    } catch (err) {
      console.warn(
        `[exam-generator] top-up call for ${missing} missing questions failed`,
        err
      );
      // Fall through with whatever we have — the caller logs the
      // shortfall but still gets a usable exam.
    }
  }

  // Slice to exact requested count in case the AI over-delivered on
  // any batch (rare but possible).
  return combined.slice(0, target);
}

export async function generateExam(input: GenerateExamInput): Promise<GeneratedQuestion[]> {
  // Mixed-format exam: explicit per-format counts. Dispatch one API call
  // per non-zero entry and concatenate in canonical order.
  const batches = (input.formatBatches ?? [])
    .filter((b) => b.count > 0)
    // Dedupe + sort canonical so questions land MCQ → T/F → SHORT_NOTES.
    .reduce<{ format: QuestionFormat; count: number }[]>((acc, b) => {
      const existing = acc.find((x) => x.format === b.format);
      if (existing) existing.count += b.count;
      else acc.push({ ...b });
      return acc;
    }, [])
    .sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format));

  if (batches.length > 1) {
    // Run each format in parallel; each format itself uses the batched
    // generator above so a "20 MCQ + 10 T/F" mix runs as 3 parallel
    // sub-calls instead of 2 big ones.
    const results = await Promise.all(
      batches.map(async (b) => {
        const args = {
          ...input,
          formatBatches: undefined,
          questionFormat: b.format,
          numQuestions: b.count,
        };
        try {
          return await generateSingleFormatBatched(args);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Couldn't generate the ${b.format} portion (${b.count} questions): ${reason}`
          );
        }
      })
    );
    return results.flat();
  }

  const single = batches[0]?.format ?? input.questionFormat;
  const count = batches[0]?.count ?? input.numQuestions;
  return generateSingleFormatBatched({
    ...input,
    formatBatches: undefined,
    questionFormat: single,
    numQuestions: count,
  });
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

  // For the hardest difficulty tiers, append the expert-level amplifier
  // block. Without it, the model interprets "expert" as "label your usual
  // questions as expert"; with it, the model has explicit constructive
  // constraints (stem length, near-miss distractors, anti-patterns) that
  // force genuinely tricky questions.
  if (EXPERT_LEVEL_DIFFICULTIES.has(input.difficulty)) {
    const amplifier = useGenericDifficulty
      ? EXPERT_AMPLIFIER_GENERIC
      : EXPERT_AMPLIFIER_MEDICAL;
    lines.push("", ...amplifier, "");
  }

  lines.push(`Number of questions: ${input.numQuestions}`);
  lines.push(...formatInstructions[format]);

  if (input.withImages) {
    lines.push(
      "IMAGE GENERATION ENABLED. For each question, decide whether an illustration would meaningfully help a student answer it — clinical photos (ulcers, rashes, jaundice, joint deformities), anatomy diagrams, ECG strips, lab trend graphs, radiograph findings, dermatology lesions, histology slides, surgical scenes, etc. " +
        "When yes, set `imageDescription` to a short (≤200 character) concrete visual description suitable as an image-generator prompt — e.g. \"Non-healing plantar foot ulcer with surrounding erythema in a 62-year-old diabetic patient, top-down view\" or \"12-lead ECG showing inferior ST elevation with reciprocal changes in I and aVL\". " +
        "When an image would NOT meaningfully help (pure recall, mechanism, pharmacology, definitions), set `imageDescription` to null. " +
        "Aim for an image on roughly 40–70% of questions where the topic is visual; less when the topic is abstract."
    );
  } else {
    lines.push(
      "Set `imageDescription` to null on every question — image generation is disabled for this exam."
    );
  }

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
      imageDescription: q.imageDescription ?? null,
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
    imageDescription: q.imageDescription ?? null,
  }));
}
