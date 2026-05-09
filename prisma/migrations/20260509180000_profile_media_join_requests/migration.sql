-- Profile media: gallery of images and short videos shown on /u/<id>.
CREATE TABLE "ProfileMedia" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "kind"         TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "pathname"     TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "sizeBytes"    INTEGER NOT NULL,
  "caption"      TEXT,
  "thumbnailUrl" TEXT,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileMedia_userId_sortOrder_idx"
  ON "ProfileMedia" ("userId", "sortOrder");

ALTER TABLE "ProfileMedia" ADD CONSTRAINT "ProfileMedia_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Group join requests: non-members ask to join a private group; the
-- owner approves or rejects, which adds them as a GroupMember.
CREATE TABLE "GroupJoinRequest" (
  "id"        TEXT NOT NULL,
  "groupId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "message"   TEXT,
  "status"    TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decidedBy" TEXT,
  CONSTRAINT "GroupJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupJoinRequest_groupId_userId_key"
  ON "GroupJoinRequest" ("groupId", "userId");
CREATE INDEX "GroupJoinRequest_groupId_status_idx"
  ON "GroupJoinRequest" ("groupId", "status");

ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_decidedBy_fkey"
  FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
