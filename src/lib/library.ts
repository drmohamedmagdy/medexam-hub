/**
 * Library helpers — file-type detection, accepted MIME types, formatting.
 *
 * Resources are stored as BYTEA inside Postgres for simplicity (no external
 * blob store). Vercel function memory + the 30 MB serverActions body limit
 * caps each individual file. If we ever need bigger files or many of them,
 * we can swap fileData -> a Vercel Blob URL with no schema-shape churn.
 */

export const ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Plain text fallbacks (sometimes useful)
  "text/plain",
] as const;

// Vercel's Hobby plan caps serverless function payloads at 4.5 MB regardless
// of what next.config.ts says. Set the cap below that so the user gets a
// friendly app-level error rather than a generic edge-level 413/network
// failure. To raise this: upgrade Vercel to Pro (50 MB) OR migrate uploads
// to Vercel Blob's client-upload pattern (no body-size limit).
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

export type FileKind = "pdf" | "word" | "powerpoint" | "text" | "other";

export function fileKind(mimeType: string): FileKind {
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "powerpoint";
  if (mimeType === "text/plain") return "text";
  return "other";
}

export function fileKindLabel(kind: FileKind): string {
  return {
    pdf: "PDF",
    word: "Word",
    powerpoint: "Slides",
    text: "Text",
    other: "File",
  }[kind];
}

export function fileKindEmoji(kind: FileKind): string {
  return {
    pdf: "📕",
    word: "📘",
    powerpoint: "📙",
    text: "📄",
    other: "📎",
  }[kind];
}

/** Browser can preview these inline — others need to be downloaded. */
export function canPreviewInline(kind: FileKind): boolean {
  return kind === "pdf" || kind === "text";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
