-- Backfill question quota usage for shared-exam forks taken before the
-- forward-only quota fix. Each completed fork inserts one UsageLog row
-- crediting the taker for the question count, dated to when they
-- submitted. Idempotent via deterministic id ("fb_" + exam id) and
-- ON CONFLICT — running twice is a no-op.

INSERT INTO "UsageLog" (id, "userId", kind, count, "yearMonth", "createdAt")
SELECT
  'fb_' || e.id,
  e."userId",
  'questions_used',
  e."numQuestions",
  TO_CHAR(COALESCE(e."submittedAt", e."createdAt") AT TIME ZONE 'UTC', 'YYYY-MM'),
  COALESCE(e."submittedAt", e."createdAt")
FROM "Exam" e
WHERE e."sharedFromId" IS NOT NULL
  AND e.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;
