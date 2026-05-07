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
      analyses: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project || project.userId !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Server-side gate that mirrors the disabled button on the project page —
  // a curl / direct GET shouldn't bypass the "all sections written" rule
  // because half-finished exports waste user trust.
  const incomplete = project.sections.filter(
    (s) => s.content.trim().length === 0 && (!s.metadataJson || s.metadataJson.length === 0)
  );
  if (incomplete.length > 0) {
    return new NextResponse(
      `Cannot export yet — ${incomplete.length} of ${project.sections.length} sections are still empty: ${incomplete
        .map((s) => s.title)
        .join(", ")}`,
      { status: 400 }
    );
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
    analyses: project.analyses.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      resultJson: a.resultJson,
      resultSvg: a.resultSvg,
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
