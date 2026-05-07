-- Research Assistant — Phase 1
CREATE TYPE "ResearchKind" AS ENUM ('PROTOCOL', 'THESIS');

CREATE TABLE "ResearchProject" (
  "id"            TEXT      NOT NULL,
  "userId"        TEXT      NOT NULL,
  "kind"          "ResearchKind" NOT NULL,
  "title"         TEXT      NOT NULL,
  "specialty"     TEXT,
  "studyType"     TEXT,
  "sampleSize"    INTEGER,
  "population"    TEXT,
  "university"    TEXT,
  "language"      TEXT      NOT NULL DEFAULT 'English',
  "citationStyle" TEXT      NOT NULL DEFAULT 'vancouver',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchProject_userId_createdAt_idx"
  ON "ResearchProject"("userId", "createdAt");

ALTER TABLE "ResearchProject"
  ADD CONSTRAINT "ResearchProject_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResearchSection" (
  "id"          TEXT      NOT NULL,
  "projectId"   TEXT      NOT NULL,
  "kind"        TEXT      NOT NULL,
  "title"       TEXT      NOT NULL,
  "content"     TEXT      NOT NULL,
  "orderIndex"  INTEGER   NOT NULL,
  "generatedAt" TIMESTAMP(3),
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResearchSection_projectId_orderIndex_key"
  ON "ResearchSection"("projectId", "orderIndex");
CREATE UNIQUE INDEX "ResearchSection_projectId_kind_key"
  ON "ResearchSection"("projectId", "kind");
CREATE INDEX "ResearchSection_projectId_idx"
  ON "ResearchSection"("projectId");

ALTER TABLE "ResearchSection"
  ADD CONSTRAINT "ResearchSection_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
