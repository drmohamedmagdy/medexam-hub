-- Mixed-format exams: each Question gets its own format, and Exam tracks
-- the full set of formats it was generated across.

ALTER TABLE "Question" ADD COLUMN "format" "QuestionFormat" NOT NULL DEFAULT 'MCQ';

-- Backfill existing rows: each question inherits its exam's questionFormat
-- so the editor + grading code works without a re-render of legacy data.
UPDATE "Question" q
SET "format" = e."questionFormat"
FROM "Exam" e
WHERE q."examId" = e."id";

ALTER TABLE "Exam" ADD COLUMN "formatsAllowedJson" TEXT;
