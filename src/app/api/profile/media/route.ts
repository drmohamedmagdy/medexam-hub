import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * Vercel Blob client-upload coordinator for profile gallery items
 * (images + short videos). The browser uploads directly to Blob with a
 * short-lived signed token.
 */
export async function POST(request: Request) {
  await requireUser();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          // Images
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          // Videos
          "video/mp4",
          "video/webm",
          "video/quicktime",
          // Documents — PDFs, Office files, plain text
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "text/csv",
          "text/markdown",
          "application/zip",
        ],
        maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB — small video clips and study docs
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
