-- Friendships: each row represents a directional request that, once
-- accepted, becomes a bidirectional connection. Canonical ordering
-- (userAId < userBId) prevents A-B / B-A duplicate rows.
CREATE TABLE "Friendship" (
  "id"          TEXT NOT NULL,
  "userAId"     TEXT NOT NULL,
  "userBId"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "requestedBy" TEXT NOT NULL,
  "message"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   TIMESTAMP(3),
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Friendship_userAId_userBId_key"
  ON "Friendship" ("userAId", "userBId");
CREATE INDEX "Friendship_userAId_status_idx"
  ON "Friendship" ("userAId", "status");
CREATE INDEX "Friendship_userBId_status_idx"
  ON "Friendship" ("userBId", "status");

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey"
  FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey"
  FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
