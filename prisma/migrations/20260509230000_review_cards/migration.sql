-- Spaced repetition: every wrong exam answer becomes a ReviewCard the
-- user can drill later. One card per (userId, questionId) — re-taking
-- the same question doesn't duplicate the row.
CREATE TABLE "ReviewCard" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "questionId"    TEXT NOT NULL,
  -- new | learning | review | relearning
  "state"          TEXT NOT NULL DEFAULT 'new',
  "due"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "intervalDays"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ease"           DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "reps"           INTEGER NOT NULL DEFAULT 0,
  "lapses"         INTEGER NOT NULL DEFAULT 0,
  "lastReviewedAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewCard_userId_questionId_key"
  ON "ReviewCard" ("userId", "questionId");
CREATE INDEX "ReviewCard_userId_due_idx"
  ON "ReviewCard" ("userId", "due");
CREATE INDEX "ReviewCard_userId_state_idx"
  ON "ReviewCard" ("userId", "state");

ALTER TABLE "ReviewCard" ADD CONSTRAINT "ReviewCard_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewCard" ADD CONSTRAINT "ReviewCard_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
