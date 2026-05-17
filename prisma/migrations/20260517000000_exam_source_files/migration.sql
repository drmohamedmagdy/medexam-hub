-- ExamSourceFile: many-to-many join between Exam and FileUpload.
-- Lets a single exam be generated from multiple uploaded files.
-- Exam.sourceFileId still points at the first/primary file for
-- backwards-compatible single-source display paths.
CREATE TABLE "ExamSourceFile" (
  "examId"     TEXT NOT NULL,
  "fileId"     TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,

  CONSTRAINT "ExamSourceFile_pkey" PRIMARY KEY ("examId", "fileId")
);

CREATE INDEX "ExamSourceFile_fileId_idx" ON "ExamSourceFile"("fileId");

ALTER TABLE "ExamSourceFile"
  ADD CONSTRAINT "ExamSourceFile_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamSourceFile"
  ADD CONSTRAINT "ExamSourceFile_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "FileUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing exam with a sourceFileId becomes a single-row
-- ExamSourceFile (orderIndex = 0). Means new multi-source code paths can
-- read uniformly from the join table without falling back to sourceFileId.
INSERT INTO "ExamSourceFile" ("examId", "fileId", "orderIndex")
SELECT "id", "sourceFileId", 0
FROM "Exam"
WHERE "sourceFileId" IS NOT NULL;
