import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/file-upload";
import { PLAN_LIMITS } from "@/lib/plans";
import { getMonthlyFileUploads } from "@/lib/quota";

/**
 * Vercel Blob client-upload coordinator for /exam/new file uploads.
 *
 * The browser calls upload() from @vercel/blob/client → that POSTs
 * here for a short-lived signed token → with the token, the browser
 * uploads directly to Vercel Blob storage, bypassing our serverless
 * function entirely. Lifts the 4.5 MB Server Action body limit; the
 * cap is now Vercel Blob's per-file ceiling.
 *
 * Auth + quota are checked when issuing the token (not after upload)
 * so we reject obvious abuse before any data crosses the wire.
 */
export async function POST(request: Request) {
  const user = await requireUser();

  // Free-tier users don't get file uploads at all.
  if (PLAN_LIMITS[user.plan].fileUploadsPerMonth === 0) {
    return NextResponse.json(
      { error: "File upload requires a Pro or Premium plan." },
      { status: 403 }
    );
  }

  const usage = await getMonthlyFileUploads(user.id, user.plan);
  if (usage.remaining < 1) {
    return NextResponse.json(
      {
        error: `You've used all ${usage.limit} file uploads this month on the ${PLAN_LIMITS[user.plan].label} plan.`,
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ACCEPTED_MIME_TYPES as unknown as string[],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          // Carry the userId through to onUploadCompleted so we can
          // attribute the upload without re-authenticating.
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op — text extraction + DB record are created by a separate
        // server action the client invokes once it has the blob URL.
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
