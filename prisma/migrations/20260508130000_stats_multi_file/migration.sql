-- Standalone Statistics workspaces gain multi-file support.
-- Mirrors the ResearchFile model: a StatsWorkspace now has many StatsFile
-- rows, and each StatsAnalysis can be tagged with the file it ran on.

CREATE TABLE "StatsFile" (
    "id"            TEXT NOT NULL,
    "workspaceId"   TEXT NOT NULL,
    "filename"      TEXT NOT NULL,
    "mimeType"      TEXT NOT NULL,
    "sizeBytes"     INTEGER NOT NULL,
    "charCount"     INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "fileUrl"       TEXT,
    "filePathname"  TEXT,
    "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatsFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StatsFile_workspaceId_idx" ON "StatsFile"("workspaceId");

ALTER TABLE "StatsFile" ADD CONSTRAINT "StatsFile_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "StatsWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StatsAnalysis" ADD COLUMN "fileId" TEXT;
CREATE INDEX "StatsAnalysis_fileId_idx" ON "StatsAnalysis"("fileId");
ALTER TABLE "StatsAnalysis" ADD CONSTRAINT "StatsAnalysis_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "StatsFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: for each StatsWorkspace that has a file attached today, copy
-- its file metadata into a StatsFile row.
INSERT INTO "StatsFile" (
    "id", "workspaceId", "filename", "mimeType", "sizeBytes", "charCount",
    "extractedText", "fileUrl", "filePathname", "uploadedAt"
)
SELECT
    'sf_' || w."id",
    w."id",
    COALESCE(w."filename", 'untitled'),
    COALESCE(w."mimeType", 'application/octet-stream'),
    COALESCE(w."sizeBytes", 0),
    COALESCE(w."charCount", 0),
    COALESCE(w."extractedText", ''),
    w."fileUrl",
    w."filePathname",
    COALESCE(w."uploadedAt", w."createdAt")
FROM "StatsWorkspace" w
WHERE w."extractedText" IS NOT NULL AND length(w."extractedText") > 0;

-- Link any pre-existing analyses on those workspaces to the backfilled file.
UPDATE "StatsAnalysis" sa
SET "fileId" = sf."id"
FROM "StatsFile" sf
WHERE sf."workspaceId" = sa."workspaceId"
  AND sa."fileId" IS NULL;
