import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Inline preview — redirects to the public Blob URL. The browser handles
 * the rest (PDFs render in the built-in viewer, text shows as text).
 *
 * Login required so we can keep this a member benefit even though all
 * plans get access. Note that once redirected, the URL itself is public —
 * blob URLs use random suffixes so they aren't enumerable, but if a user
 * shares the URL it can be opened by anyone.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: { fileUrl: true, isPublished: true },
  });
  if (!r || !r.isPublished) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(r.fileUrl);
}
