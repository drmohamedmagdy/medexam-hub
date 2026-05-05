import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Streams the file inline so the browser can preview it (PDFs render in
 * the built-in viewer, text shows as text). Other file types may still be
 * downloaded by the browser depending on its handlers.
 *
 * Login required — keeps the library a member benefit, even though all
 * plans (including Free) can access.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  const resource = await prisma.libraryResource.findUnique({
    where: { id },
    select: {
      mimeType: true,
      filename: true,
      fileData: true,
      isPublished: true,
    },
  });

  if (!resource || !resource.isPublished) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(resource.fileData), {
    status: 200,
    headers: {
      "Content-Type": resource.mimeType,
      "Content-Disposition": `inline; filename="${encodeFilename(resource.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

function encodeFilename(name: string): string {
  // Sanitize for safe Content-Disposition
  return name.replace(/["\r\n]/g, "");
}
