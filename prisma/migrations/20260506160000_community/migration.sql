-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('POST', 'QUESTION', 'ARTICLE');

-- Group
CREATE TABLE "Group" (
  "id"          TEXT      NOT NULL,
  "ownerId"     TEXT      NOT NULL,
  "name"        TEXT      NOT NULL,
  "description" TEXT,
  "isPublic"    BOOLEAN   NOT NULL DEFAULT false,
  "inviteCode"  TEXT      NOT NULL,
  "coverUrl"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");
CREATE INDEX "Group_isPublic_createdAt_idx" ON "Group"("isPublic", "createdAt");

ALTER TABLE "Group"
  ADD CONSTRAINT "Group_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroupMember
CREATE TABLE "GroupMember" (
  "id"       TEXT      NOT NULL,
  "groupId"  TEXT      NOT NULL,
  "userId"   TEXT      NOT NULL,
  "role"     TEXT      NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroupInvite
CREATE TABLE "GroupInvite" (
  "id"          TEXT      NOT NULL,
  "groupId"     TEXT      NOT NULL,
  "invitedById" TEXT      NOT NULL,
  "email"       TEXT      NOT NULL,
  "acceptedAt"  TIMESTAMP(3),
  "acceptedBy"  TEXT,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupInvite_email_idx" ON "GroupInvite"("email");
CREATE INDEX "GroupInvite_groupId_idx" ON "GroupInvite"("groupId");

ALTER TABLE "GroupInvite"
  ADD CONSTRAINT "GroupInvite_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvite"
  ADD CONSTRAINT "GroupInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Post
CREATE TABLE "Post" (
  "id"            TEXT      NOT NULL,
  "authorId"      TEXT      NOT NULL,
  "groupId"       TEXT,
  "kind"          "PostKind" NOT NULL DEFAULT 'POST',
  "title"         TEXT,
  "body"          TEXT      NOT NULL,
  "imageUrl"      TEXT,
  "imagePathname" TEXT,
  "linkUrl"       TEXT,
  "linkLabel"     TEXT,
  "digestSentAt"  TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Post_groupId_createdAt_idx" ON "Post"("groupId", "createdAt");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostComment
CREATE TABLE "PostComment" (
  "id"        TEXT      NOT NULL,
  "postId"    TEXT      NOT NULL,
  "authorId"  TEXT      NOT NULL,
  "body"      TEXT      NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");

ALTER TABLE "PostComment"
  ADD CONSTRAINT "PostComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment"
  ADD CONSTRAINT "PostComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
