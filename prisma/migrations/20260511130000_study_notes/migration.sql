-- Topic notes / quick summaries. Users can ask the AI for a structured
-- summary of a specific topic before taking an exam. Saved so users can
-- re-read what they generated and we have a history.
CREATE TABLE "StudyNote" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "topic"      TEXT NOT NULL,
  "specialty"  TEXT,
  "examType"   TEXT,
  "language"   TEXT,
  -- Markdown body. Front-end renders headings/lists; PDF export can
  -- reuse the same content.
  "content"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyNote_userId_createdAt_idx"
  ON "StudyNote" ("userId", "createdAt");

ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
