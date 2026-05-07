import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderResearchDocx } from "@/lib/research-docx";
import { kindLabel as kindLabelFor } from "@/lib/research-templates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();

  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!project || project.userId !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = await renderResearchDocx({
    title: project.title,
    kindLabel: kindLabelFor(project.kind),
    authorName: user.name ?? null,
    university: project.university,
    specialty: project.specialty,
    studyType: project.studyType,
    language: project.language,
    citationStyle: project.citationStyle,
    sections: project.sections
      .filter((s) => s.content.trim().length > 0 || (s.metadataJson && s.metadataJson.length > 0))
      .map((s) => ({
        title: s.title,
        content: s.content,
        metadataJson: s.metadataJson,
      })),
  });

  const safeName = project.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) || "research";
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
