import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderResearchDocx } from "@/lib/research-docx";

/**
 * Standalone Statistics report export. Reuses the research DOCX renderer
 * with empty `sections` and the workspace's analyses appended as the
 * usual "Statistical Analysis Appendix".
 */
export async function GET() {
  const user = await requireUser();

  const ws = await prisma.statsWorkspace.findUnique({
    where: { userId: user.id },
    include: {
      files: { select: { filename: true } },
      analyses: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ws || ws.analyses.length === 0) {
    return new NextResponse("No analyses to export. Run at least one first.", {
      status: 400,
    });
  }

  const filenames = ws.files.map((f) => f.filename);
  const titleLine =
    filenames.length === 1
      ? `Statistics report — ${filenames[0]}`
      : filenames.length > 1
        ? `Statistics report — ${filenames.length} data files`
        : "Statistics report";

  const buf = await renderResearchDocx({
    title: titleLine,
    kindLabel: "Statistics report",
    authorName: user.name ?? null,
    university: null,
    specialty: null,
    studyType: null,
    language: "English",
    citationStyle: "vancouver",
    sections: [],
    analyses: ws.analyses.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      resultJson: a.resultJson,
      resultSvg: a.resultSvg,
    })),
  });

  const safeName =
    (filenames[0] ?? "statistics-report").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) ||
    "statistics-report";
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
