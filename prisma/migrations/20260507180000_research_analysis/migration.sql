-- Research Phase 3: statistical analyses computed against attached CSV files.

CREATE TABLE "ResearchAnalysis" (
  "id"         TEXT      NOT NULL,
  "projectId"  TEXT      NOT NULL,
  "fileId"     TEXT,
  "kind"       TEXT      NOT NULL,
  "title"      TEXT      NOT NULL,
  "configJson" TEXT      NOT NULL,
  "resultJson" TEXT,
  "resultSvg"  TEXT,
  "computedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchAnalysis_projectId_createdAt_idx"
  ON "ResearchAnalysis"("projectId", "createdAt");

ALTER TABLE "ResearchAnalysis"
  ADD CONSTRAINT "ResearchAnalysis_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchAnalysis"
  ADD CONSTRAINT "ResearchAnalysis_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "ResearchFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
