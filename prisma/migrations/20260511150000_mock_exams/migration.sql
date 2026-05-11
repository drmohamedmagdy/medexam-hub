-- Mock-exam mode: a multi-block timed simulation of a real exam.
-- Each block is just a regular Exam row tagged with mockExamId +
-- blockIndex; reusing the existing exam-take + grading machinery
-- means we don't rebuild the UI/logic for taking questions.
CREATE TABLE "MockExam" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  -- Matches a key in src/lib/mock-exam-templates.ts (e.g. "usmle-step1-mini")
  "templateId"        TEXT NOT NULL,
  "templateLabel"     TEXT NOT NULL,
  -- "in_progress" | "completed" | "abandoned"
  "status"            TEXT NOT NULL DEFAULT 'in_progress',
  "currentBlockIndex" INTEGER NOT NULL DEFAULT 0,
  "startedAt"         TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockExam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MockExam_userId_status_idx" ON "MockExam" ("userId", "status");

ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag exams with their parent mock + block position.
ALTER TABLE "Exam" ADD COLUMN "mockExamId" TEXT;
ALTER TABLE "Exam" ADD COLUMN "blockIndex" INTEGER;

CREATE INDEX "Exam_mockExamId_blockIndex_idx" ON "Exam" ("mockExamId", "blockIndex");

ALTER TABLE "Exam" ADD CONSTRAINT "Exam_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
