import type { ResearchKind } from "@/generated/prisma/client";

export type ResearchSectionDef = {
  kind: string;
  title: string;
  // Concrete instruction the LLM follows when generating this section.
  prompt: string;
  // Rough target length so the AI doesn't write a 10-page Introduction
  // for what was meant to be a 1-pager.
  approxWords: number;
  // Rendering style. "prose" = freeform academic text (default). "diagram"
  // = structured JSON; the editor renders it visually (e.g. PRISMA flow).
  style?: "prose" | "diagram";
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

// ─────────────────────────────────────────────────────────────────────────────
// MANUSCRIPT — paper for journal submission, IMRaD layout
// ─────────────────────────────────────────────────────────────────────────────

const MANUSCRIPT_SECTIONS: ResearchSectionDef[] = [
  {
    kind: "title_page",
    title: "Title Page",
    prompt:
      "Write a journal-style title page. Include: a concise running title (max 50 chars), the full title, author block (use the user's name + affiliation if known, otherwise placeholders like [Author, Affiliation]), corresponding author with placeholder email/phone, word count, and 4–8 keywords. Plain text formatted as a single block.",
    approxWords: 200,
  },
  {
    kind: "abstract",
    title: "Abstract",
    prompt:
      "Write a structured abstract under 300 words with bold sub-headers: Background, Methods, Results, Conclusions. Use the supplied study parameters; for Results, fabricate plausible but clearly-illustrative numbers and label them as illustrative if needed.",
    approxWords: 280,
  },
  {
    kind: "keywords",
    title: "Keywords",
    prompt:
      "Provide 5–8 MeSH-aligned keywords for this manuscript, comma-separated on a single line.",
    approxWords: 30,
  },
  {
    kind: "introduction",
    title: "Introduction",
    prompt:
      "Write the Introduction section of a research paper. Three to four paragraphs. Start broad, narrow to the specific research gap, end with a one-sentence statement of the study's aim. Include in-text citations in the requested style.",
    approxWords: 600,
  },
  {
    kind: "materials_methods",
    title: "Materials and Methods",
    prompt:
      "Write the Materials and Methods section. Subsections (use bold sub-headings on their own line ending with ':'): Study design, Participants, Data collection, Intervention (if applicable), Outcome measures, Statistical analysis. Reference specific tests by name.",
    approxWords: 900,
  },
  {
    kind: "results",
    title: "Results",
    prompt:
      "Write the Results section. Three paragraphs: baseline characteristics, primary outcome, secondary outcomes / safety. Refer to Table 1 / Figure 1 in-text. Use plausible-but-clearly-illustrative numbers (the user will produce the actual tables/figures).",
    approxWords: 800,
  },
  {
    kind: "discussion",
    title: "Discussion",
    prompt:
      "Write the Discussion section. Open with a one-paragraph summary of main findings, then context vs prior literature (compare and contrast), proposed mechanisms, strengths, limitations, and implications. End with a forward-looking sentence on future research.",
    approxWords: 900,
  },
  {
    kind: "conclusion",
    title: "Conclusion",
    prompt:
      "Write a tight Conclusion: 1–2 paragraphs restating the answer to the research question and the practical takeaway. No new data.",
    approxWords: 200,
  },
  {
    kind: "references",
    title: "References",
    prompt:
      "Write a References list with 20–30 plausible citations in the requested style. Number in citation order. Use real-looking author names, journals, years, and volumes — but do NOT invent DOIs.",
    approxWords: 600,
  },
  {
    kind: "acknowledgments",
    title: "Acknowledgments",
    prompt:
      "Write a brief Acknowledgments paragraph (~80 words) thanking the participants, the institution / hospital, and any contributors who don't meet authorship criteria. Generic but warm.",
    approxWords: 100,
  },
  {
    kind: "conflicts_funding",
    title: "Conflicts of Interest & Funding",
    prompt:
      "Write two short labeled paragraphs: 'Conflicts of Interest:' (default to a generic 'The authors declare no conflicts of interest.') and 'Funding:' (default to 'This research received no specific grant from any funding agency in the public, commercial, or not-for-profit sectors.'). Adjust if the user supplied different info in notes.",
    approxWords: 80,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEMATIC_REVIEW — PRISMA-aligned systematic review / meta-analysis
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEMATIC_REVIEW_SECTIONS: ResearchSectionDef[] = [
  {
    kind: "abstract_pico",
    title: "Structured Abstract (PICO)",
    prompt:
      "Write a structured abstract under 350 words with these bold sub-headers on their own lines ending with ':' — Background, Objectives, Eligibility criteria (PICO), Information sources, Risk of bias, Synthesis methods, Results, Limitations, Conclusions, Registration. Phrase precisely, using the supplied topic.",
    approxWords: 320,
  },
  {
    kind: "introduction",
    title: "Introduction",
    prompt:
      "Write the Introduction. State the rationale (why this review is needed), known evidence, and the explicit objectives of the review framed as a PICO question.",
    approxWords: 600,
  },
  {
    kind: "sr_methods",
    title: "Methods",
    prompt:
      "Write the Methods section of a systematic review using PRISMA 2020 structure. Use bold sub-headings on their own lines ending with ':' — Protocol and registration, Eligibility criteria, Information sources, Search strategy (give an example string for one database), Selection process, Data collection process, Data items, Risk of bias assessment, Synthesis methods (narrative and/or meta-analysis with effect measure, model, heterogeneity, sensitivity, and subgroup analysis).",
    approxWords: 1100,
  },
  {
    kind: "prisma_flow",
    title: "PRISMA Flow Diagram",
    prompt:
      "Output ONLY a JSON object — no markdown fences, no commentary — with these numeric fields representing the PRISMA 2020 flow:\n" +
      "{\n" +
      "  \"identifiedDatabases\": number,\n" +
      "  \"identifiedRegisters\": number,\n" +
      "  \"identifiedOtherSources\": number,\n" +
      "  \"duplicatesRemoved\": number,\n" +
      "  \"recordsScreened\": number,\n" +
      "  \"recordsExcluded\": number,\n" +
      "  \"reportsSought\": number,\n" +
      "  \"reportsNotRetrieved\": number,\n" +
      "  \"reportsAssessed\": number,\n" +
      "  \"reportsExcluded\": number,\n" +
      "  \"reasonsExcluded\": [\"...\", \"...\"],\n" +
      "  \"studiesIncluded\": number,\n" +
      "  \"reportsIncluded\": number\n" +
      "}\n" +
      "Use plausible numbers consistent with the supplied topic and the user's stated information sources / databases. The chain must balance arithmetically (records screened = identified − duplicates; reports assessed = sought − not retrieved; included = assessed − excluded).",
    approxWords: 200,
    style: "diagram",
  },
  {
    kind: "sr_results",
    title: "Results",
    prompt:
      "Write the Results section. Bold sub-headings: Study selection (refer to PRISMA flow), Study characteristics (mention range of years, designs, populations, interventions), Risk of bias in studies, Results of individual studies, Results of synthesis (narrative + a sentence summarizing pooled effect with 95% CI and I² if a meta-analysis was conducted), Reporting biases. Use plausible-but-illustrative numbers.",
    approxWords: 1100,
  },
  {
    kind: "discussion",
    title: "Discussion",
    prompt:
      "Write the Discussion section. Cover: summary of evidence, limitations of evidence (within studies and across studies), limitations of the review process, agreements / disagreements with previous reviews, and implications for practice and policy.",
    approxWords: 900,
  },
  {
    kind: "conclusion",
    title: "Conclusion",
    prompt:
      "Write a tight Conclusion (1–2 paragraphs) restating the main finding and recommending future research directions.",
    approxWords: 200,
  },
  {
    kind: "references",
    title: "References",
    prompt:
      "Write a References list of 25–40 plausible citations in the requested style. Number in citation order. Use real-looking author names, journals, years, and volumes — but do NOT invent DOIs.",
    approxWords: 700,
  },
];

export function sectionsFor(kind: ResearchKind): ResearchSectionDef[] {
  switch (kind) {
    case "PROTOCOL":
      return PROTOCOL_SECTIONS;
    case "THESIS":
      return THESIS_SECTIONS;
    case "MANUSCRIPT":
      return MANUSCRIPT_SECTIONS;
    case "SYSTEMATIC_REVIEW":
      return SYSTEMATIC_REVIEW_SECTIONS;
  }
}

export function findSectionDef(
  kind: ResearchKind,
  sectionKind: string
): ResearchSectionDef | null {
  return sectionsFor(kind).find((s) => s.kind === sectionKind) ?? null;
}

export function kindLabel(kind: ResearchKind): string {
  switch (kind) {
    case "PROTOCOL":
      return "Research Protocol";
    case "THESIS":
      return "Thesis";
    case "MANUSCRIPT":
      return "Journal Manuscript";
    case "SYSTEMATIC_REVIEW":
      return "Systematic Review / Meta-analysis";
  }
}

export function kindEmoji(kind: ResearchKind): string {
  switch (kind) {
    case "PROTOCOL":
      return "📋";
    case "THESIS":
      return "📚";
    case "MANUSCRIPT":
      return "📄";
    case "SYSTEMATIC_REVIEW":
      return "🔬";
  }
}
