-- Capture client-side and server-side runtime errors so we can find
-- and fix what's actually breaking in prod, instead of relying on
-- users to report a generic "page couldn't load".
CREATE TABLE "ErrorLog" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "route"     TEXT,
  "message"   TEXT NOT NULL,
  "stack"     TEXT,
  -- Next.js error digest, useful for grouping the same crash.
  "digest"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog" ("createdAt");
CREATE INDEX "ErrorLog_userId_idx"    ON "ErrorLog" ("userId");
CREATE INDEX "ErrorLog_digest_idx"    ON "ErrorLog" ("digest");

ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
