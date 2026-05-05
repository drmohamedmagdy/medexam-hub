import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Forces a file download. We stream the file FROM Vercel Blob THROUGH our
 * server with `Content-Disposition: attachment` so the browser saves it
 * with the original filename instead of rendering inline.
 *
 * Streaming-from-blob is fine on Vercel — function memory and time are
 * not the bottleneck; we just pipe through the Web ReadableStream.
 *
 * Increments the resource's downloadCount as a fire-and-forget side effect.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: {
      fileUrl: true,
      mimeType: true,
      filename: true,
      isPublished: true,
    },
  });

  if (!r || !r.isPublished) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Best-effort download counter — never block the response on this.
  void prisma.libraryResource
    .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
    .catch(() => {});

  // Fetch the blob and stream it back with attachment disposition.
  const blobRes = await fetch(r.fileUrl);
  if (!blobRes.ok || !blobRes.body) {
    return new NextResponse("File unavailable", { status: 502 });
  }

  return new NextResponse(blobRes.body, {
    status: 200,
    headers: {
      "Content-Type": r.mimeType,
      "Content-Disposition": `attachment; filename="${encodeFilename(r.filename)}"`,
      // Mirror Content-Length if upstream provided it
      ...(blobRes.headers.get("content-length")
        ? { "Content-Length": blobRes.headers.get("content-length")! }
        : {}),
    },
  });
}

function encodeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "");
}
