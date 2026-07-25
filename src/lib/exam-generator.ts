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

// Additional style guide appended ONLY for expert-tier True/False questions.
// Captures the pattern seen in graduate-level Arabic exams (e.g. Dr. Ahmed
// Ayyad's research-methodology paper): textbook-sounding statements with
// one subtle trap that requires careful reading + precise mastery of
// terminology to detect. Without this block, True/False at expert tier
// devolves into obviously-true definitions which a 1st-year student can
// answer at a glance.
const EXPERT_TRUE_FALSE_STYLE = [
  "TRUE/FALSE EXPERT STYLE — each statement must follow this pattern:",
  "• Sounds like an authoritative textbook claim on first read; the trap (if any) is one carefully-chosen word.",
  "• Common trap mechanics, mix several across the exam:",
  "   – ABSOLUTE QUALIFIER misplaced: \"always / never / only / must / cannot\" applied to a claim that has exceptions.",
  "   – NEAR-SYNONYM SWAP: a key technical term replaced by a related-but-wrong concept (e.g. induction↔deduction, validity↔reliability, dependent↔independent variable, induction-complete↔induction-partial).",
  "   – SCOPE INVERSION: a claim that's true for one scope (e.g. quantitative research) stated as if it's true for the other (qualitative).",
  "   – CAUSAL DIRECTION FLIP: \"X causes Y\" written when the textbook says Y causes X (or they correlate without causation).",
  "   – NUMERIC OR ORDINAL TWEAK: \"the first / the second / 3 categories\" when the source says otherwise.",
  "   – PARTIAL DEFINITION: a definition that's correct as far as it goes but omits a load-bearing condition (e.g. \"a hypothesis must be testable\" without \"and falsifiable\").",
  "• Roughly balance true:false at 50/50 across the set — don't make all statements false-with-a-trap.",
  "• Avoid trivially-true statements (\"research aims to discover new knowledge\") and trivially-false ones (\"experiments don't need a control group\").",
  "• A graduate student should have to pause, reread, and recall the exact definition to answer correctly.",
  "• Explanation must point to the specific word or phrase that determines the truth value — \"the trap is X; the correct phrasing would be Y\".",
];

// Equation / quantitative-content guidance. Auto-attached whenever the
// topic or source material looks math-heavy (Greek letters, formulas,
// equals signs framed as definitions). Without this, the generator tends
// to convert equation-rich pages into shallow recall ("define resistance")
// instead of the worked-calculation questions the source actually warrants.
const EQUATION_QUESTION_STYLE = [
  "QUANTITATIVE / EQUATION QUESTIONS — when the topic or source involves formulas:",
  "• FORMAT — output equations as Unicode-rendered plain text (the UI does NOT process LaTeX or MathJax):",
  "   — Greek letters: paste the actual glyph: Δ, η, π, σ, μ, λ, Ω, ρ, θ, φ (NOT \\Delta, $\\Delta$, or \"Delta\").",
  "   — Superscripts: prefer Unicode (r⁴, r², x³, 10⁻⁶) when the exponent is a small integer. For larger / symbolic exponents, fall back to caret notation (r^n, e^(-kt)).",
  "   — Subscripts: prefer Unicode (r₁, r₂, V₀, P_atm). For longer subscripts use underscore (V_initial).",
  "   — Multiplication: use × or · (never *). Division: / or fraction bar phrased inline (\"numerator / denominator\"). Parenthesise to disambiguate (\"8Lη / (πr⁴)\").",
  "   — Relations: =, ≠, ≈, ≤, ≥, ∝, ∞.",
  "• QUESTION TYPES — when an equation is the subject, write at least one of each kind across the exam:",
  "   1. VARIABLE IDENTIFICATION — \"In R = 8Lη / (πr⁴), what does η represent?\" (options: viscosity / density / velocity / pressure).",
  "   2. PROPORTIONALITY — \"In R = 8Lη / (πr⁴), if r is halved, R becomes…\" (×16, because (½)⁻⁴ = 16).",
  "   3. UNITS / DIMENSIONS — \"What are the SI units of η in this equation?\" (Pa·s).",
  "   4. CALCULATION — give numeric values, ask for the result. Show the working in the explanation.",
  "   5. ANALOGY — \"ΔP = Q × R is analogous to which law?\" (Ohm's V = IR).",
  "   6. DERIVATION / EDGE CASE — \"Why does r enter as r⁴ rather than r²?\" or \"Which assumption fails for blood (a non-Newtonian fluid)?\"",
  "• SCALE DIFFICULTY TO THE TIER:",
  "   — BEGINNER / STUDENT: variable identification, direct substitution into a given equation.",
  "   — INTERN / RESIDENT: rearrange for an unknown, single proportionality step (\"if X doubles, Y…\").",
  "   — SPECIALIST / CONSULTANT: multi-step ratios (e.g. (0.5)⁴ = 1/16 → R₁ × 16 = R₂), dimensional analysis, recognising the equation from a described scenario.",
  "   — BOARD / Expert: derivations from first principles, identifying the assumption that breaks in a clinical edge case, combining two equations (e.g. Reynolds number ↔ Poiseuille, Starling forces ↔ filtration coefficient).",
  "• EXPLANATIONS — for any quantitative question, show the substitution and the arithmetic explicitly, e.g. \"R₁/R₂ = r₂⁴/r₁⁴ = (0.5r₁)⁴ / r₁⁴ = (0.5)⁴ = 1/16, so R₂ = 16·R₁\". Don't skip steps.",
];

// Detect equation-rich content via Greek letters or common math operators.
// Used to decide whether to attach EQUATION_QUESTION_STYLE to the prompt.
const EQUATION_INDICATORS_RE =
  /[αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ∫∑∏∂∇±≈≠≤≥∞∝÷·]|[a-zA-Z]\^[0-9]|[xy]\s*=\s*[^=]/;

function looksQuantitative(input: GenerateExamInput): boolean {
  const haystack = [input.sourceText, input.topic, input.specialty]
    .filter(Boolean)
    .join(" ");
  return EQUATION_INDICATORS_RE.test(haystack);
}

// Retry wrapper for OpenAI chat.completions.create.
//
// OpenAI's own SDK retries on some errors (429, 408, connection resets)
// but NOT 500. A user reported "500 The server had an error processing
// your request" bubbling straight into the exam-generation UI. That's
// transient — the same request retried moments later almost always
// succeeds. Wrap the call so 5xx / 429 / network errors are retried up
// to 3 times with exponential backoff (2s, 4s, 8s) before giving up.
const OPENAI_MAX_ATTEMPTS = 3;
const OPENAI_BASE_BACKOFF_MS = 2000;

function isRetryableOpenAIError(err: unknown): boolean {
  const anyErr = err as { status?: number; code?: string; message?: string };
  if (typeof anyErr?.status === "number" && anyErr.status >= 500) return true;
  if (anyErr?.status === 429) return true;
  if (anyErr?.status === 408) return true;
  const msg = (anyErr?.message ?? "").toLowerCase();
  return (
    /server had an error|internal server|gateway|timeout|econnreset|network|fetch failed|socket hang up/.test(
      msg
    )
  );
}

// Non-streaming completion type. We never pass `stream: true` so the
// return is always a full ChatCompletion.
type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;

async function callOpenAIWithRetry(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
): Promise<ChatCompletion> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt++) {
    try {
      return await client.chat.completions.create(params);
    } catch (err) {
      lastError = err;
      if (attempt === OPENAI_MAX_ATTEMPTS || !isRetryableOpenAIError(err)) {
        break;
      }
      const backoff = OPENAI_BASE_BACKOFF_MS * 2 ** (attempt - 1);
      console.warn(
        `[exam-generator] OpenAI attempt ${attempt}/${OPENAI_MAX_ATTEMPTS} failed, retrying in ${backoff}ms:`,
        err instanceof Error ? err.message : err
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI request failed after retries");
}

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

  // When source material is provided, the source DOMINATES — the audience
  // persona is just a framing hint. A user reported uploading a research-
  // methodology PDF and getting cardiology vignettes back because the default
  // MEDICAL persona ("you are a medical question writer") overpowered the
  // "use the source" instruction buried at the end of the user message.
  // Fix: source-mode uses its own system prompt that tells the model the
  // source IS the curriculum, regardless of audience.
  const hasSource = Boolean(input.sourceText);
  const system = hasSource
    ? [
        "You are an exam-question writer. Your ONLY job is to generate questions strictly from the source material provided in the user message.",
        "The source material defines the entire subject and scope. If the source is about research methodology, write research-methodology questions. If it is about history, write history questions. If it is about engineering, write engineering questions. NEVER default to medical or clinical scenarios unless the source itself is medical.",
        "Every question must test facts, definitions, concepts, mechanisms, or recommendations that are EXPLICITLY present in the source text. Do not introduce content from your training data that is not supported by the source.",
        "If the source does not contain enough material for the requested number of questions, generate fewer questions rather than fabricating content outside the source.",
        `Output language: ${language.promptName}. Write the question stem, all options, the explanation, and the learning point in ${language.promptName}.`,
      ].join(" ")
    : personaByAudience[audience].join(" ");

  const lines: string[] = [];

  // ── SOURCE MATERIAL FIRST ───────────────────────────────────────────
  // Put the source at the TOP of the user message so it shapes the
  // model's attention from the start, instead of arriving after pages
  // of audience/specialty/difficulty priming that pull it toward
  // medical content.
  if (input.sourceText) {
    lines.push("=== SOURCE MATERIAL ===");
    if (input.sourceFilename) {
      lines.push(`Source filename: ${input.sourceFilename}`);
    }
    lines.push(input.sourceText);
    lines.push("=== END SOURCE MATERIAL ===");
    lines.push("");
    lines.push(
      "CRITICAL: Generate EVERY question STRICTLY from the source material above."
    );
    lines.push(
      "• The source's subject domain (whether research methodology, history, statistics, philosophy, engineering, anything) is the ONLY subject you may write about."
    );
    lines.push(
      "• DO NOT introduce facts, examples, patient cases, clinical scenarios, or any content that isn't explicitly in the source — even if you know it from training."
    );
    lines.push(
      "• If you cannot find enough material in the source for the requested count, generate fewer questions. Quality and source-adherence beat quantity."
    );

    // When the user gave a topic/scope alongside the file, treat it as a
    // HARD filter on which portion of the source to use, not just a
    // theme hint. Supports chapter ("Chapter 3", "الفصل الثالث"),
    // section ("Section on hypothesis testing"), page range ("Pages
    // 10-20"), or arbitrary topic phrase.
    if (input.topic) {
      lines.push("");
      lines.push(`SCOPE WITHIN SOURCE: "${input.topic}"`);
      lines.push(
        "• Use ONLY the portion of the source material that matches the scope above. Ignore the rest of the source."
      );
      lines.push(
        "• Chapter / section reference (e.g. \"Chapter 3\", \"الفصل الثالث\", \"Section 4.2\"): locate the heading in the source and use ONLY content between that heading and the next sibling heading."
      );
      lines.push(
        "• Page range (e.g. \"Pages 10-20\", \"صفحات 10–20\"): if page numbers are preserved in the extracted text, use only that range; if not, approximate by position (e.g. for \"pages 10-20\" of a 30-page document, use the middle third of the source text)."
      );
      lines.push(
        "• Topic phrase (e.g. \"hypothesis testing\", \"sampling methods\", \"الانحراف المعياري\"): use only paragraphs/sentences that explicitly address that topic."
      );
      lines.push(
        "• If the scope can't be located in the source, generate fewer questions from the parts that come closest, rather than silently expanding to the whole source."
      );
    }
    lines.push("");
  }

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
  // Source-mode also uses the generic phrasing — the source determines the
  // domain, so the medical-specific "ward scenarios" wording would mislead.
  const useGenericDifficulty =
    audience === "NONMEDICAL" || audience === "PARAMEDICAL" || hasSource;
  const guidance =
    (useGenericDifficulty && GENERIC_DIFFICULTY_GUIDANCE[input.difficulty]) ||
    DIFFICULTY_GUIDANCE[input.difficulty];
  lines.push(`Difficulty: ${input.difficulty} — ${guidance}`);

  // For the hardest difficulty tiers, append the expert-level amplifier
  // block. Without it, the model interprets "expert" as "label your usual
  // questions as expert"; with it, the model has explicit constructive
  // constraints (stem length, near-miss distractors, anti-patterns) that
  // force genuinely tricky questions. In source-mode we use the GENERIC
  // amplifier — the medical one's clinical-vignette examples bias the
  // model away from non-medical source material.
  const isExpertTier = EXPERT_LEVEL_DIFFICULTIES.has(input.difficulty);
  if (isExpertTier) {
    const amplifier = useGenericDifficulty
      ? EXPERT_AMPLIFIER_GENERIC
      : EXPERT_AMPLIFIER_MEDICAL;
    lines.push("", ...amplifier, "");
  }

  lines.push(`Number of questions: ${input.numQuestions}`);
  lines.push(...formatInstructions[format]);

  // True/False at expert tier gets an extra style guide. The base
  // formatInstructions for TRUE_FALSE just says "write a clear declarative
  // statement"; at expert tier we want the textbook-trap pattern from
  // graduate-level exam papers (precise word swaps, scope inversions, etc.).
  if (isExpertTier && format === "TRUE_FALSE") {
    lines.push("", ...EXPERT_TRUE_FALSE_STYLE, "");
  }

  // Equation-handling guidance: attach whenever the source, topic, or
  // specialty hints at quantitative content (Greek letters, formulas,
  // explicit variables). The model would otherwise default to definition-
  // style recall on equation-rich pages.
  if (looksQuantitative(input)) {
    lines.push("", ...EQUATION_QUESTION_STYLE, "");
  }

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

  // Final reminder when source-mode — restated at the bottom of the prompt
  // so it's the last thing the model sees before generating.
  if (input.sourceText) {
    lines.push(
      "REMINDER: every question must be answerable using ONLY the source material above. No outside content."
    );
  }

  lines.push("Return JSON matching the provided schema. No prose outside the JSON.");

  const jsonSchema = format === "SHORT_NOTES" ? SHORT_NOTES_JSON_SCHEMA : MCQ_JSON_SCHEMA;

  const completion = await callOpenAIWithRetry(client, {
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
