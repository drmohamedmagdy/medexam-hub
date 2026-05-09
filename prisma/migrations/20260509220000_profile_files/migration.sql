-- Profile gallery now accepts arbitrary documents (PDF/DOCX/etc.) in
-- addition to images and videos. We store the original filename so the
-- download link keeps the user-facing name instead of the random suffix
-- that Vercel Blob assigns.
ALTER TABLE "ProfileMedia" ADD COLUMN "originalName" TEXT;
