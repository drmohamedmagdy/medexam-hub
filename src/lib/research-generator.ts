import Anthropic from "@anthropic-ai/sdk";
import type { ResearchKind } from "@/generated/prisma/client";
import { findSectionDef, kindLabel } from "@/lib/research-templates";

export type AttachedFile = {
  filename: string;
  charCount: number;
  // Pre-truncated text — caller is responsible for keeping it under prompt budget.
  text: string;
};

export type GenerateSectionInput = {
  kind: ResearchKind;
  sectionKind: string;
  // Project metadata (carried into every prompt so each section is self-aware)
  title: string;
  specialty?: string | null;
  studyType?: string | null;
  sampleSize?: number | null;
  population?: string | null;
  university?: string | null;
  language: string;
  citationStyle: string;
  notes?: string | null;
  // Previously-generated sections so each new one is consistent with what
  // came before — passed as "previous: <kind>: <first 600 chars>".
  priorSections?: Array<{ title: string; content: string }>;
  // Data files attached to the project (extracted text), e.g. CSVs, draft
  // protocols, lecture PDFs. Truncated by the caller.
  attachedFiles?: AttachedFile[];
  // Pre-computed stats results for this project (descriptives, t-tests,
  // correlations, histograms). Passed as structured JSON the model can
  // pull real numbers from instead of fabricating illustrative ones.
  computedAnalyses?: Array<{ kind: string; title: string; resultJson: string }>;
};

const ANTHROPIC_MODEL_DEFAULT = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const PER_FILE_CHAR_BUDGET = 6000;
const MAX_FILE_CHUNKS = 5;

export async function generateSection(input: GenerateSectionInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables."
    );
  }

  const def = findSectionDef(input.kind, input.sectionKind);
  if (!def) throw new Error(`Unknown section "${input.sectionKind}" for ${input.kind}`);

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || ANTHROPIC_MODEL_DEFAULT;

  const projectKindLabel = kindLabel(input.kind).toLowerCase();
  const citationStyle = input.citationStyle.toUpperCase();

  const metadata = [
    `Title: ${input.title}`,
    input.specialty ? `Specialty: ${input.specialty}` : null,
    input.studyType ? `Study type: ${input.studyType}` : null,
    input.sampleSize ? `Sample size: ${input.sampleSize}` : null,
    input.population ? `Target population: ${input.population}` : null,
    input.university ? `University / Institution: ${input.university}` : null,
    input.notes ? `User notes: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const priorContext =
    input.priorSections && input.priorSections.length > 0
      ? "\n\nPreviously written sections (for continuity — don't repeat them):\n" +
        input.priorSections
          .map(
            (s) =>
              `## ${s.title}\n${s.content.slice(0, 600)}${
                s.content.length > 600 ? "…" : ""
              }`
          )
          .join("\n\n")
      : "";

  const fileContext =
    input.attachedFiles && input.attachedFiles.length > 0
      ? "\n\nUser-supplied data files (treat as authoritative — pull numbers, themes, and findings from these):\n" +
        input.attachedFiles
          .slice(0, MAX_FILE_CHUNKS)
          .map(
            (f) =>
              `--- ${f.filename} (${f.charCount.toLocaleString()} chars) ---\n${f.text.slice(
                0,
                PER_FILE_CHAR_BUDGET
              )}${f.text.length > PER_FILE_CHAR_BUDGET ? "\n…[truncated]" : ""}`
          )
          .join("\n\n")
      : "";

  const analysisContext =
    input.computedAnalyses && input.computedAnalyses.length > 0
      ? "\n\nComputed statistical analyses on the user's actual data (use these EXACT numbers — they are authoritative; do not fabricate alternative values):\n" +
        input.computedAnalyses
          .slice(0, 10)
          .map(
            (a) =>
              `### ${a.title} (kind: ${a.kind})\n${a.resultJson.slice(0, 2000)}${
                a.resultJson.length > 2000 ? "\n…[truncated]" : ""
              }`
          )
          .join("\n\n")
      : "";

  // The PRISMA section needs JSON-only output, so its system prompt is tighter.
  const isDiagram = def.style === "diagram";

  const systemPrompt = isDiagram
    ? "You are a precise data generator. Output ONLY a valid JSON object — no markdown fences, no commentary, no leading or trailing text. The object's numbers must balance arithmetically as instructed."
    : [
        `You are an academic writing assistant helping a medical / paramedical author draft a ${projectKindLabel}.`,
        "Write in formal academic language. Stay neutral, evidence-based, and avoid first-person.",
        `Use the ${citationStyle} citation style — but only when you cite something. If the section doesn't naturally need citations (e.g. Aim, Hypotheses), don't shoehorn them in.`,
        "Output plain prose with optional bulleted lists or numbered lists. Use simple bold sub-headings on their own line ending with ':' only when the section's prompt explicitly asks for subsections. Do not include the section title yourself — the document already has it.",
        "Do not invent DOIs or specific p-values from non-existent studies. Plausibility ≥ specificity.",
        `Output language: ${input.language}.`,
      ].join(" ");

  const userPrompt = [
    metadata,
    "",
    `--- ${def.title} ---`,
    def.prompt,
    isDiagram ? "" : `Aim for ~${def.approxWords} words.`,
    priorContext,
    fileContext,
    analysisContext,
  ]
    .filter((s) => s !== "")
    .join("\n");

  const completion = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    temperature: isDiagram ? 0.2 : 0.4,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Concatenate text-block content; ignore non-text blocks if any.
  const text = completion.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Empty response from Claude");
  return text;
}
