"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSection } from "@/lib/research-generator";
import { sectionsFor } from "@/lib/research-templates";
import { canUseResearch } from "@/lib/research-access";

// ─────────────────────────────────────────────────────────────────────────────
// Create project
// ─────────────────────────────────────────────────────────────────────────────

export type CreateResearchState = { ok?: boolean; error?: string; projectId?: string } | null;

const CreateSchema = z.object({
  kind: z.enum(["PROTOCOL", "THESIS"]),
  title: z.string().min(3).max(200),
  specialty: z.string().max(120).optional(),
  studyType: z.string().max(120).optional(),
  sampleSize: z.coerce.number().int().min(1).max(1_000_000).optional(),
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
    return { error: "The Research Assistant is available on the Pro and Premium plans." };
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
      sampleSize: parsed.data.sampleSize ?? null,
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
    return { ok: false, error: "Available on Pro and Premium plans." };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!projectId || !sectionId) return { ok: false, error: "Missing IDs." };

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
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
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed. Try again.",
    };
  }

  await prisma.researchSection.update({
    where: { id: sectionId },
    data: { content, generatedAt: new Date() },
  });

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

