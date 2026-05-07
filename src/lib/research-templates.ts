import type { ResearchKind } from "@/generated/prisma/client";

export type ResearchSectionDef = {
  kind: string;
  title: string;
  // Concrete instruction the LLM follows when generating this section.
  prompt: string;
  // Rough target length so the AI doesn't write a 10-page Introduction
  // for what was meant to be a 1-pager.
  approxWords: number;
};

const PROTOCOL_SECTIONS: ResearchSectionDef[] = [
  {
    kind: "introduction",
    title: "Introduction",
    prompt:
      "Write the Introduction. Frame the clinical / scientific problem, why it matters, the current state of evidence, and end with a clear sentence about what this study will add. Stay neutral and citable.",
    approxWords: 400,
  },
  {
    kind: "lit_review",
    title: "Literature Review",
    prompt:
      "Write the Literature Review. Summarize the most relevant prior work in 4–6 thematic paragraphs (not a bullet list). Identify the gap that justifies this study at the end.",
    approxWords: 700,
  },
  {
    kind: "aim",
    title: "Aim of the Study",
    prompt:
      "Write the Aim. One short paragraph stating the primary objective and 2–4 specific objectives as a numbered list.",
    approxWords: 150,
  },
  {
    kind: "questions",
    title: "Research Questions / Hypotheses",
    prompt:
      "Write the Research Questions and (if appropriate for the study type) the corresponding null and alternative hypotheses. Numbered list.",
    approxWords: 200,
  },
  {
    kind: "methodology",
    title: "Methodology",
    prompt:
      "Write the Methodology. Cover: study design, study setting, study period, target population, sampling technique, sample size justification (with the formula referenced for the given sampleSize), data collection tools, and procedure. Use clear subsection headings.",
    approxWords: 800,
  },
  {
    kind: "inclusion_exclusion",
    title: "Inclusion & Exclusion Criteria",
    prompt:
      "List inclusion criteria and exclusion criteria as two separate bulleted lists. Be specific to the population and study type.",
    approxWords: 200,
  },
  {
    kind: "ethics",
    title: "Ethical Considerations",
    prompt:
      "Write the Ethical Considerations section: IRB / ethics committee approval, informed consent, confidentiality, data handling, risks / benefits, and reference Helsinki / GDPR where relevant.",
    approxWords: 300,
  },
  {
    kind: "stats_plan",
    title: "Statistical Analysis Plan",
    prompt:
      "Write the Statistical Analysis Plan. Specify the software (SPSS / R / Stata), descriptive statistics, the inferential tests you'll use (and when each applies — e.g. t-test vs Mann-Whitney), the significance threshold, and how you'll report effect sizes / confidence intervals.",
    approxWords: 350,
  },
  {
    kind: "references",
    title: "References",
    prompt:
      "Write a References section with 8–12 plausible, well-formatted citations in the requested citation style. Use real-looking author names, journals, years, and volumes — but do NOT invent DOIs. Number them in citation order.",
    approxWords: 400,
  },
];

const THESIS_SECTIONS: ResearchSectionDef[] = [
  {
    kind: "introduction",
    title: "Chapter 1: Introduction",
    prompt:
      "Write the Introduction chapter of a thesis. Set the scientific context, state the problem, justify the study, summarize the aim and objectives, and outline the thesis structure. Multiple paragraphs.",
    approxWords: 1000,
  },
  {
    kind: "lit_review",
    title: "Chapter 2: Literature Review",
    prompt:
      "Write the Literature Review chapter. Organize around 5–8 themes drawn from the topic. Synthesize findings rather than listing studies. End with a concise paragraph naming the research gap that this thesis addresses.",
    approxWords: 1800,
  },
  {
    kind: "patients_methods",
    title: "Chapter 3: Patients and Methods",
    prompt:
      "Write the Patients and Methods chapter. Subsections: study design, setting, ethics, sample size and power calculation, inclusion / exclusion criteria, data collection tools and procedure, intervention details (if applicable), outcome measures, and statistical analysis plan.",
    approxWords: 1200,
  },
  {
    kind: "results",
    title: "Chapter 4: Results",
    prompt:
      "Write a sample Results chapter. Use the supplied study parameters to fabricate a plausible-but-clearly-illustrative dataset. Include a baseline characteristics paragraph, primary outcome paragraph, and secondary outcomes paragraph. Reference Table 1 / Figure 1 / Figure 2 in-text where appropriate (the user will produce the actual tables / figures themselves).",
    approxWords: 1000,
  },
  {
    kind: "discussion",
    title: "Chapter 5: Discussion",
    prompt:
      "Write the Discussion chapter. Open with a one-paragraph summary of main findings, then place them in the context of prior literature (compare and contrast), discuss possible mechanisms, address strengths and limitations, and finish with implications for clinical practice and future research.",
    approxWords: 1400,
  },
  {
    kind: "conclusion",
    title: "Chapter 6: Conclusion",
    prompt:
      "Write a tight Conclusion: 1–2 paragraphs restating the answer to the research question and the main practical takeaways. No new data.",
    approxWords: 300,
  },
  {
    kind: "references",
    title: "References",
    prompt:
      "Write a References list with 25–40 plausible citations spanning seminal and recent papers in the field, in the requested citation style. Number in citation order. Use real-looking author names, journals, years, and volumes — but do NOT invent DOIs.",
    approxWords: 800,
  },
];

export function sectionsFor(kind: ResearchKind): ResearchSectionDef[] {
  return kind === "PROTOCOL" ? PROTOCOL_SECTIONS : THESIS_SECTIONS;
}

export function findSectionDef(
  kind: ResearchKind,
  sectionKind: string
): ResearchSectionDef | null {
  return sectionsFor(kind).find((s) => s.kind === sectionKind) ?? null;
}
