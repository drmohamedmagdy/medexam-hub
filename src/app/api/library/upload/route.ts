import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ALLOWED_MIME_TYPES } from "@/lib/library";

/**
 * Vercel Blob client-upload coordinator.
 *
 * The upload form on the client calls `upload()` from `@vercel/blob/client`,
 * which POSTs here for a short-lived signed token. With the token, the
 * browser uploads directly to Vercel Blob — bypassing our serverless
 * function and its body-size limits.
 *
 * Auth: only admins can request a token (so randoms can't upload).
 */
export async function POST(request: Request) {
  // Verify the caller is an admin BEFORE parsing the body, so anonymous
  // requests are rejected immediately.
  await requireAdmin();

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED_MIME_TYPES as unknown as string[],
          // 100 MB hard ceiling at Vercel Blob
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op — we save metadata via a separate server action after
        // the client has the URL.
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
