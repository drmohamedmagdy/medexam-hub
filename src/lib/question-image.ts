import "server-only";
import OpenAI from "openai";
import { put } from "@vercel/blob";

/**
 * Generates an illustrative image for an exam question via OpenAI's
 * image_generation tool (Responses API) and uploads the result to
 * Vercel Blob. Returns the blob URL + pathname so the caller can
 * persist them on the Question row.
 *
 * Returns null on any failure — image generation is best-effort and
 * the exam should remain useable without the image.
 */
export async function generateQuestionImage(
  description: string,
  opts?: { sizeHint?: "auto" | "1024x1024" | "1024x1536" | "1536x1024" }
): Promise<{ url: string; pathname: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!apiKey || !blobToken) return null;

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

  // Wrap the description with educational framing — the model is happy
  // to draw clinical photos (ulcers, rashes, anatomy) when it knows
  // the context is education, not medical-advice or unsafe content.
  const prompt = `Educational medical-exam illustration. ${description}. Clean textbook style, clear lighting, no text overlays, no watermarks.`;

  let b64: string | null = null;
  try {
    // gpt-image-1 is callable through the dedicated images.generate endpoint;
    // this is simpler than the Responses-API tool route and returns base64
    // directly. Falls back gracefully if the model name is rejected.
    const result = await client.images.generate({
      model,
      prompt,
      size: opts?.sizeHint ?? "1024x1024",
      n: 1,
    });
    const data = result.data?.[0];
    b64 = data?.b64_json ?? null;
    // Some model variants return a URL instead of base64 — handle that too.
    if (!b64 && data?.url) {
      const r = await fetch(data.url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        b64 = buf.toString("base64");
      }
    }
  } catch (e) {
    console.warn("[question-image] generation failed", e);
    return null;
  }

  if (!b64) return null;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return null;
  }

  // Upload to Vercel Blob with a random suffix so multiple questions
  // can share a description without colliding on the pathname.
  const safeSlug = description
    .slice(0, 60)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const filename = `question-images/${safeSlug || "image"}-${Date.now()}.png`;

  try {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/png",
      token: blobToken,
      addRandomSuffix: true,
    });
    return { url: blob.url, pathname: blob.pathname };
  } catch (e) {
    console.warn("[question-image] blob upload failed", e);
    return null;
  }
}
