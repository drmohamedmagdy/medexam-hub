import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * Vercel Blob client-upload coordinator for payment-proof screenshots.
 *
 * Any logged-in user can upload one image — the browser uploads directly
 * to Vercel Blob with a short-lived signed token, bypassing our serverless
 * function body-size limits.
 */
export async function POST(request: Request) {
  await requireUser();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB is plenty for a phone screenshot
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Metadata is saved by the submit-manual-payment server action.
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
