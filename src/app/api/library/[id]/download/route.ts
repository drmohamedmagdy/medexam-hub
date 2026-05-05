import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Forces a file download with Content-Disposition: attachment.
 * Increments the resource's downloadCount as a side effect — fire-and-forget,
 * not blocking the response.
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

  // Best-effort download counter
  void prisma.libraryResource
    .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
    .catch(() => {});

  return new NextResponse(new Uint8Array(resource.fileData), {
    status: 200,
    headers: {
      "Content-Type": resource.mimeType,
      "Content-Disposition": `attachment; filename="${encodeFilename(resource.filename)}"`,
      "Content-Length": String(resource.fileData.length),
    },
  });
}

function encodeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "");
}
