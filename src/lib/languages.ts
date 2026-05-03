export type Language = {
  code: string;
  label: string;
  promptName: string;
};

export const EXAM_LANGUAGES: Language[] = [
  { code: "en", label: "English", promptName: "English" },
  { code: "ar", label: "العربية (Arabic)", promptName: "Modern Standard Arabic" },
  { code: "fr", label: "Français (French)", promptName: "French" },
  { code: "es", label: "Español (Spanish)", promptName: "Spanish" },
  { code: "de", label: "Deutsch (German)", promptName: "German" },
  { code: "it", label: "Italiano (Italian)", promptName: "Italian" },
  { code: "pt", label: "Português (Portuguese)", promptName: "Portuguese" },
  { code: "tr", label: "Türkçe (Turkish)", promptName: "Turkish" },
  { code: "ur", label: "اردو (Urdu)", promptName: "Urdu" },
  { code: "fa", label: "فارسی (Persian)", promptName: "Persian" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string): Language | null {
  return EXAM_LANGUAGES.find((l) => l.code === code) ?? null;
}
