-- Research Assistant — Phase 2

-- Two new project kinds
ALTER TYPE "ResearchKind" ADD VALUE 'MANUSCRIPT';
ALTER TYPE "ResearchKind" ADD VALUE 'SYSTEMATIC_REVIEW';

-- Per-section structured data (e.g. PRISMA flow numbers). Plain prose
-- sections leave this null.
ALTER TABLE "ResearchSection"
  ADD COLUMN "metadataJson" TEXT;

-- Data files attached to a research project. Text extract is fed into
-- AI prompts so the Statistical Analysis Plan and Results sections can
-- reason about the user's actual data.
CREATE TABLE "ResearchFile" (
  "id"            TEXT      NOT NULL,
  "projectId"     TEXT      NOT NULL,
  "filename"      TEXT      NOT NULL,
  "mimeType"      TEXT      NOT NULL,
  "sizeBytes"     INTEGER   NOT NULL,
  "charCount"     INTEGER   NOT NULL,
  "extractedText" TEXT      NOT NULL,
  "fileUrl"       TEXT,
  "filePathname"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchFile_projectId_idx" ON "ResearchFile"("projectId");

ALTER TABLE "ResearchFile"
  ADD CONSTRAINT "ResearchFile_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
