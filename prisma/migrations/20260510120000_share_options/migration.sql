-- Owner-controlled constraints on a shared exam link:
--   shareExpiresAt    — link stops working after this date
--   shareMaxTakers    — accept only N unique takers
--   shareTimeLimitSec — per-attempt timer (overrides master timeLimitSec
--                        on forked attempts)
ALTER TABLE "Exam" ADD COLUMN "shareExpiresAt"    TIMESTAMP(3);
ALTER TABLE "Exam" ADD COLUMN "shareMaxTakers"    INTEGER;
ALTER TABLE "Exam" ADD COLUMN "shareTimeLimitSec" INTEGER;
