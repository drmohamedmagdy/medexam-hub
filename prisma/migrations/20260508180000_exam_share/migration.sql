-- Shareable exams: a creator can hand a link to anyone, who forks the
-- exam (questions copied to a new owned Exam row). The master exam
-- owns a leaderboard of all forks via Exam.sharedFromId.
ALTER TABLE "Exam" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "Exam" ADD COLUMN "sharedFromId" TEXT;

CREATE UNIQUE INDEX "Exam_shareToken_key" ON "Exam"("shareToken");
CREATE INDEX "Exam_sharedFromId_idx" ON "Exam"("sharedFromId");

ALTER TABLE "Exam" ADD CONSTRAINT "Exam_sharedFromId_fkey"
  FOREIGN KEY ("sharedFromId") REFERENCES "Exam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
