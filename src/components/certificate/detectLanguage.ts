// Detect whether a string is predominantly Arabic vs Latin script.
// Used to decide which language to render the certificate in.
//
// Rule: any Arabic codepoint anywhere in the input → Arabic. We could
// do a percent threshold but in practice Arabic exam titles never
// contain Latin letters and vice versa for English exams. The simpler
// presence-check is more robust than a ratio.

const ARABIC_RANGE_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type CertLanguage = "en" | "ar";

export function detectCertLanguage(...samples: Array<string | null | undefined>): CertLanguage {
  for (const s of samples) {
    if (!s) continue;
    if (ARABIC_RANGE_RE.test(s)) return "ar";
  }
  return "en";
}
