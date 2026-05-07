-- Standalone Statistics tool: one workspace per user, with their own
-- CSV + analyses, independent of the research feature.

CREATE TABLE "StatsWorkspace" (
  "id"            TEXT      NOT NULL,
  "userId"        TEXT      NOT NULL,
  "filename"      TEXT,
  "mimeType"      TEXT,
  "sizeBytes"     INTEGER,
  "charCount"     INTEGER,
  "extractedText" TEXT,
  "fileUrl"       TEXT,
  "filePathname"  TEXT,
  "uploadedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StatsWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatsWorkspace_userId_key" ON "StatsWorkspace"("userId");

ALTER TABLE "StatsWorkspace"
  ADD CONSTRAINT "StatsWorkspace_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StatsAnalysis" (
  "id"          TEXT      NOT NULL,
  "workspaceId" TEXT      NOT NULL,
  "kind"        TEXT      NOT NULL,
  "title"       TEXT      NOT NULL,
  "configJson"  TEXT      NOT NULL,
  "resultJson"  TEXT,
  "resultSvg"   TEXT,
  "computedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StatsAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StatsAnalysis_workspaceId_createdAt_idx"
  ON "StatsAnalysis"("workspaceId", "createdAt");

ALTER TABLE "StatsAnalysis"
  ADD CONSTRAINT "StatsAnalysis_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "StatsWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
