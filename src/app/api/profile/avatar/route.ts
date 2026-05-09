import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * Vercel Blob client-upload coordinator for profile avatars. The browser
 * uploads directly to Blob with a short-lived signed token, bypassing
 * serverless body-size limits.
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
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB — plenty for a profile pic
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
