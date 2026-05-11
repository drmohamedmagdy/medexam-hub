-- Optional AI-generated images for exam questions. Generated through
-- OpenAI's gpt-image-1 / Responses API image_generation tool, then
-- uploaded to Vercel Blob so the image URL is the canonical source.
ALTER TABLE "Question" ADD COLUMN "imageUrl"         TEXT;
-- Vercel Blob pathname so we can delete on exam delete.
ALTER TABLE "Question" ADD COLUMN "imagePathname"    TEXT;
-- One-line description of what the image is supposed to show.
-- Acts as alt text + is also fed to the tutor chat so the AI can
-- reason about the image without re-analysing it.
ALTER TABLE "Question" ADD COLUMN "imageDescription" TEXT;

-- Per-exam opt-in flag. Image generation costs ~$0.04 per image so it
-- has to be explicit; off by default. Forks of shared exams inherit
-- the master's images via the existing question copy, not this flag.
ALTER TABLE "Exam" ADD COLUMN "withImages" BOOLEAN NOT NULL DEFAULT false;
