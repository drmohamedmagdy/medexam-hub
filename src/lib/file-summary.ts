import OpenAI from "openai";
import { findLanguage, DEFAULT_LANGUAGE } from "@/lib/languages";

// Hard cap on the number of characters we send to the model. ~30k chars is
// well within gpt-4o-mini's context window and keeps the cost predictable
// even when a user uploads a 200-page PDF.
const MAX_CHARS_FOR_SUMMARY = 30_000;

/**
 * Asks OpenAI to summarise a file and returns the markdown summary as plain
 * text. Rendering to PDF is deliberately not done server-side — instead the
 * summary is shown on a styled HTML page, and the user clicks "Download as
 * PDF" to print it. That avoids the broken-font problem you hit when a
 * server-side PDF library (jsPDF / pdfkit / pdf-lib) tries to render Arabic,
 * Urdu, Persian, or any other non-Latin script without an embedded font.
 */
export async function summariseFile(args: {
  text: string;
  filename: string;
  language?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const lang = findLanguage(args.language ?? DEFAULT_LANGUAGE) ?? findLanguage(DEFAULT_LANGUAGE)!;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: [
          "You are a concise study assistant that summarises documents for medical and paramedical students.",
          "Produce a clean, exam-ready summary that's faithful to the source — never invent facts.",
          "Use plain text with simple section headings; avoid markdown tables.",
          "If the document covers a clinical topic, include high-yield clinical points the reader is likely to be tested on.",
          `Output language: ${lang.promptName}. Write the entire summary — including section headings — in ${lang.promptName}. Keep universally-recognized acronyms (ECG, CT, NSTEMI, NICE, AHA) in their standard Latin form.`,
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `File name: ${args.filename}`,
          "",
          "Write a study summary of the following document with this structure:",
          "  • A 2–4 sentence overview at the top.",
          "  • Section headings (Key concepts, Important definitions, Clinical/practical points, etc.) with bulleted items underneath.",
          "  • A short \"Highlights\" list of 5–10 single-sentence takeaways at the end.",
          "Aim for ~600–1200 words depending on document length. Keep bullets short.",
          "",
          "--- Document content ---",
          args.text.slice(0, MAX_CHARS_FOR_SUMMARY),
        ].join("\n"),
      },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim();
  if (!out) throw new Error("Empty summary from OpenAI");
  return out;
}
