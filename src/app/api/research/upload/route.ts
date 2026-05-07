import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseResearch } from "@/lib/research-access";

/**
 * Vercel Blob client-upload coordinator for research-project data files.
 * Pro/Premium-only — gated alongside the rest of the research feature.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!canUseResearch(user.plan)) {
    return NextResponse.json(
      { error: "Research file uploads require Pro or Premium." },
      { status: 403 }
    );
  }
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "text/plain",
          "text/markdown",
          "text/csv",
          "application/csv",
          "application/vnd.ms-excel",
        ],
        maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB — bigger than exam-prep so datasets fit
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
