import OpenAI from "openai";
import type { ResearchKind } from "@/generated/prisma/client";
import { findSectionDef } from "@/lib/research-templates";

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
  // came before — passed as "previous: <kind>: <first 400 chars>".
  priorSections?: Array<{ title: string; content: string }>;
};

export async function generateSection(input: GenerateSectionInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const def = findSectionDef(input.kind, input.sectionKind);
  if (!def) throw new Error(`Unknown section "${input.sectionKind}" for ${input.kind}`);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const projectKindLabel = input.kind === "PROTOCOL" ? "research protocol" : "thesis manuscript";
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
          .map((s) => `## ${s.title}\n${s.content.slice(0, 600)}${s.content.length > 600 ? "…" : ""}`)
          .join("\n\n")
      : "";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: [
          `You are an academic writing assistant helping a medical / paramedical author draft a ${projectKindLabel}.`,
          "Write in formal academic English (or the requested language). Stay neutral, evidence-based, and avoid first-person.",
          `Use the ${citationStyle} citation style — but only when you cite something. If the section doesn't naturally need citations (e.g. Aim, Hypotheses), don't shoehorn them in.`,
          "Output plain prose with optional bulleted lists or numbered lists. Use simple section headings only when the section's prompt explicitly asks for subsections. Do not include the section title yourself — the document already has it.",
          "Do not invent DOIs, exact patient counts in published literature, or specific p-values from non-existent studies. Plausibility ≥ specificity.",
          `Output language: ${input.language}.`,
        ].join(" "),
      },
      {
        role: "user",
        content: [
          metadata,
          "",
          `--- ${def.title} ---`,
          def.prompt,
          `Aim for ~${def.approxWords} words.`,
          priorContext,
        ].join("\n"),
      },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim();
  if (!out) throw new Error("Empty response from OpenAI");
  return out;
}
