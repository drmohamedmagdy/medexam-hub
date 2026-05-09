import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ALLOWED_COURSE_MIME_TYPES, MAX_VIDEO_SIZE_BYTES } from "@/lib/courses";

/**
 * Vercel Blob client-upload coordinator for course videos + thumbnails.
 * Mirrors /api/library/upload — admin-only, short-lived signed token,
 * browser uploads directly to Blob.
 */
export async function POST(request: Request) {
  await requireAdmin();

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED_COURSE_MIME_TYPES as unknown as string[],
          maximumSizeInBytes: MAX_VIDEO_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op — metadata is saved by a separate server action.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
