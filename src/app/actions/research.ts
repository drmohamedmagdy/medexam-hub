"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSection } from "@/lib/research-generator";
import { sectionsFor } from "@/lib/research-templates";
import { canUseResearch } from "@/lib/research-access";
import {
  chargeForResearchSection,
  preflightResearchSectionCharge,
} from "@/lib/research-costs";
import { extractText, MAX_FILE_BYTES } from "@/lib/file-upload";

// ─────────────────────────────────────────────────────────────────────────────
// Create project
// ─────────────────────────────────────────────────────────────────────────────

export type CreateResearchState = { ok?: boolean; error?: string; projectId?: string } | null;

const CreateSchema = z.object({
  kind: z.enum(["PROTOCOL", "THESIS", "MANUSCRIPT", "SYSTEMATIC_REVIEW"]),
  title: z.string().min(3).max(200),
  specialty: z.string().max(120).optional(),
  studyType: z.string().max(120).optional(),
  // 0 means "not specified" — number inputs that the user blanks out come
  // through as 0, and many study types (qualitative, lab, SR) genuinely
  // don't have a numeric sample size.
  sampleSize: z.coerce.number().int().min(0).max(1_000_000).optional(),
  population: z.string().max(500).optional(),
  university: z.string().max(200).optional(),
  language: z.string().max(60).default("English"),
  citationStyle: z.enum(["vancouver", "apa", "mla"]).default("vancouver"),
  notes: z.string().max(2000).optional(),
});

export async function createResearchProjectAction(
  _prev: CreateResearchState,
  formData: FormData
): Promise<CreateResearchState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return {
      error:
        "The Research Assistant is available on the Researcher plan (unlimited) or Premium (pay-per-section in credits).",
    };
  }

  const parsed = CreateSchema.safeParse({
    kind: formData.get("kind"),
    title: String(formData.get("title") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim() || undefined,
    studyType: String(formData.get("studyType") ?? "").trim() || undefined,
    sampleSize: formData.get("sampleSize"),
    population: String(formData.get("population") ?? "").trim() || undefined,
    university: String(formData.get("university") ?? "").trim() || undefined,
    language: String(formData.get("language") ?? "English").trim() || "English",
    citationStyle: formData.get("citationStyle"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const project = await prisma.researchProject.create({
    data: {
      userId: user.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      specialty: parsed.data.specialty ?? null,
      studyType: parsed.data.studyType ?? null,
      // Treat 0 as "unspecified" — our form sends 0 when the user blanks
      // the field, but for SR / lab / qualitative work the value is N/A.
      sampleSize: parsed.data.sampleSize && parsed.data.sampleSize > 0 ? parsed.data.sampleSize : null,
      population: parsed.data.population ?? null,
      university: parsed.data.university ?? null,
      language: parsed.data.language,
      citationStyle: parsed.data.citationStyle,
      notes: parsed.data.notes ?? null,
    },
  });

  // Create empty rows for every section so the editor has something to render
  // before the user generates content. Each section starts with empty content
  // and the user clicks "Generate" per section.
  const defs = sectionsFor(parsed.data.kind);
  await prisma.$transaction(
    defs.map((def, i) =>
      prisma.researchSection.create({
        data: {
          projectId: project.id,
          kind: def.kind,
          title: def.title,
          content: "",
          orderIndex: i,
        },
      })
    )
  );

  revalidatePath("/research");
  redirect(`/research/${project.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate a section
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateSectionState =
  | { ok: true; content: string }
  | { ok: false; error: string }
  | null;

export async function generateSectionAction(
  _prev: GenerateSectionState,
  formData: FormData
): Promise<GenerateSectionState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return {
      ok: false,
      error:
        "Available on the Researcher plan (unlimited) or Premium (pay-per-section in credits).",
    };
  }

  // Pre-flight credit check for Premium users — fail fast before burning
  // any Claude tokens if they can't afford this section.
  const preflightError = await preflightResearchSectionCharge(user.id, user.plan);
  if (preflightError) return { ok: false, error: preflightError };

  const projectId = String(formData.get("projectId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!projectId || !sectionId) return { ok: false, error: "Missing IDs." };

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      files: { orderBy: { createdAt: "asc" } },
      analyses: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "Project not found." };
  }

  const section = project.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: "Section not found." };

  // Pass already-generated sections that come BEFORE this one as continuity
  // context so the AI knows what's been said.
  const priorSections = project.sections
    .filter((s) => s.orderIndex < section.orderIndex && s.content.trim().length > 0)
    .map((s) => ({ title: s.title, content: s.content }));

  const attachedFiles = project.files.map((f) => ({
    filename: f.filename,
    charCount: f.charCount,
    text: f.extractedText,
  }));

  // Pass computed stats analyses as a structured context block — that way
  // the AI's Results section uses the user's REAL numbers instead of made
  // up illustrative ones.
  const computedAnalyses = project.analyses
    .filter((a) => a.resultJson)
    .map((a) => ({
      kind: a.kind,
      title: a.title,
      resultJson: a.resultJson!,
    }));

  let content: string;
  try {
    content = await generateSection({
      kind: project.kind,
      sectionKind: section.kind,
      title: project.title,
      specialty: project.specialty,
      studyType: project.studyType,
      sampleSize: project.sampleSize,
      population: project.population,
      university: project.university,
      language: project.language,
      citationStyle: project.citationStyle,
      notes: project.notes,
      priorSections,
      attachedFiles,
      computedAnalyses,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed. Try again.",
    };
  }

  // Diagram sections (currently just the PRISMA flow) emit JSON; persist
  // it in metadataJson so the editor can render the visual without needing
  // to re-parse on every read. The content field holds a human-readable
  // textual fallback.
  const sectionsForKind = sectionsFor(project.kind);
  const def = sectionsForKind.find((s) => s.kind === section.kind);
  const isDiagram = def?.style === "diagram";
  let metadataJson: string | null = null;
  let storedContent = content;
  if (isDiagram) {
    try {
      const parsed = JSON.parse(content);
      metadataJson = JSON.stringify(parsed);
      storedContent = "";
    } catch {
      // Model didn't return clean JSON — keep raw output so the user can
      // see what came back, but don't crash the editor. They can regenerate.
      metadataJson = null;
      storedContent = content;
    }
  }

  await prisma.researchSection.update({
    where: { id: sectionId },
    data: {
      content: storedContent,
      metadataJson,
      generatedAt: new Date(),
    },
  });

  // Charge credits AFTER successful generation so failures don't burn the
  // user's balance. No-op for the Researcher plan (unlimited).
  try {
    await chargeForResearchSection({
      userId: user.id,
      plan: user.plan,
      projectId,
      sectionTitle: section.title,
    });
  } catch (e) {
    // Race: balance dropped between preflight and charge (very unlikely
    // with one user, one tab). Surface it but the section is already saved.
    console.error("[research] post-generation credit charge failed:", e);
  }

  revalidatePath(`/research/${projectId}`);
  return { ok: true, content };
}

// ─────────────────────────────────────────────────────────────────────────────
// Save edits to a section
// ─────────────────────────────────────────────────────────────────────────────

export async function saveSectionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!projectId || !sectionId) return;

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) return;

  await prisma.researchSection.update({
    where: { id: sectionId },
    data: { content },
  });
  revalidatePath(`/research/${projectId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete project
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteResearchProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const project = await prisma.researchProject.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) return;
  await prisma.researchProject.delete({ where: { id } });
  revalidatePath("/research");
  redirect("/research");
}

// ─────────────────────────────────────────────────────────────────────────────
// Update project metadata — title, specialty, sample size, language, etc.
// Lets the user adjust assumptions and regenerate sections with the new
// context (especially handy when the project's actually a lab study or
// systematic review and the original RCT-flavored defaults don't fit).
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateResearchState = { ok?: boolean; error?: string } | null;

const UpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(200),
  specialty: z.string().max(120).optional(),
  studyType: z.string().max(120).optional(),
  sampleSize: z.coerce.number().int().min(0).max(1_000_000).optional(),
  population: z.string().max(500).optional(),
  university: z.string().max(200).optional(),
  language: z.string().max(60).default("English"),
  citationStyle: z.enum(["vancouver", "apa", "mla"]).default("vancouver"),
  notes: z.string().max(2000).optional(),
});

export async function updateResearchProjectAction(
  _prev: UpdateResearchState,
  formData: FormData
): Promise<UpdateResearchState> {
  const user = await requireUser();
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    title: String(formData.get("title") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim() || undefined,
    studyType: String(formData.get("studyType") ?? "").trim() || undefined,
    sampleSize: formData.get("sampleSize"),
    population: String(formData.get("population") ?? "").trim() || undefined,
    university: String(formData.get("university") ?? "").trim() || undefined,
    language: String(formData.get("language") ?? "English").trim() || "English",
    citationStyle: formData.get("citationStyle"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.researchProject.findUnique({
    where: { id: parsed.data.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== user.id) {
    return { error: "Project not found." };
  }

  await prisma.researchProject.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      specialty: parsed.data.specialty ?? null,
      studyType: parsed.data.studyType ?? null,
      sampleSize:
        parsed.data.sampleSize && parsed.data.sampleSize > 0
          ? parsed.data.sampleSize
          : null,
      population: parsed.data.population ?? null,
      university: parsed.data.university ?? null,
      language: parsed.data.language,
      citationStyle: parsed.data.citationStyle,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath(`/research/${parsed.data.id}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach a data file to a project — saves its extracted text so future
// section generations can reason about the user's actual data.
// ─────────────────────────────────────────────────────────────────────────────

export type AttachFileState = { ok?: boolean; error?: string } | null;

const AttachSchema = z.object({
  projectId: z.string().min(1),
  fileUrl: z.string().url(),
  filePathname: z.string().min(1).max(500),
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(1).max(MAX_FILE_BYTES),
});

export async function attachResearchFileAction(
  _prev: AttachFileState,
  formData: FormData
): Promise<AttachFileState> {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return {
      error:
        "Available on the Researcher plan or Premium (pay-per-section in credits).",
    };
  }

  const parsed = AttachSchema.safeParse({
    projectId: formData.get("projectId"),
    fileUrl: formData.get("fileUrl"),
    filePathname: formData.get("filePathname"),
    filename: formData.get("filename"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  });
  if (!parsed.success) return { error: "Invalid upload metadata." };

  const project = await prisma.researchProject.findUnique({
    where: { id: parsed.data.projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { error: "Project not found." };
  }

  // Fetch the just-uploaded blob and run it through the same text extractor
  // we use for /exam/new file uploads (PDF, DOCX, TXT, MD, CSV).
  let buffer: Buffer;
  try {
    const res = await fetch(parsed.data.fileUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return {
      error: `Couldn't read the uploaded file: ${
        e instanceof Error ? e.message : "unknown"
      }`,
    };
  }

  let extractedText = "";
  let charCount = 0;
  try {
    const result = await extractText(
      buffer,
      parsed.data.mimeType,
      parsed.data.filename
    );
    extractedText = result.text;
    charCount = result.charCount;
  } catch (e) {
    return {
      error: `Couldn't extract text from this file: ${
        e instanceof Error ? e.message : "unsupported format"
      }`,
    };
  }

  await prisma.researchFile.create({
    data: {
      projectId: parsed.data.projectId,
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      charCount,
      extractedText,
      fileUrl: parsed.data.fileUrl,
      filePathname: parsed.data.filePathname,
    },
  });

  revalidatePath(`/research/${parsed.data.projectId}`);
  return { ok: true };
}

export async function deleteResearchFileAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const file = await prisma.researchFile.findUnique({
    where: { id },
    include: { project: { select: { userId: true } } },
  });
  if (!file || file.project.userId !== user.id) return;

  // Best-effort blob delete — don't block on it.
  if (file.filePathname) {
    void del(file.filePathname).catch(() => {});
  }

  await prisma.researchFile.delete({ where: { id } });
  revalidatePath(`/research/${file.projectId}`);
}

