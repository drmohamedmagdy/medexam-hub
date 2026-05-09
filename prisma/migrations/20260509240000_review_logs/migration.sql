-- Per-grade history. Lets us compute review accuracy, trend over time,
-- and per-specialty performance — all derivable from raw events instead
-- of running counters on ReviewCard.
CREATE TABLE "ReviewLog" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "cardId"     TEXT NOT NULL,
  -- again | hard | good | easy
  "grade"      TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewLog_userId_reviewedAt_idx"
  ON "ReviewLog" ("userId", "reviewedAt");
CREATE INDEX "ReviewLog_cardId_idx" ON "ReviewLog" ("cardId");

ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "ReviewCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Track when we last sent a review-due reminder so the daily cron
-- doesn't double-send within 24h.
ALTER TABLE "User" ADD COLUMN "lastReviewReminderAt" TIMESTAMP(3);
