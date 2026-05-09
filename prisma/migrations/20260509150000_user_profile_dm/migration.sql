-- User profile fields: avatar (Vercel Blob), bio, public flag.
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarPathname" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "profilePublic" BOOLEAN NOT NULL DEFAULT true;

-- Direct-message system. One row per message, tied to sender + receiver.
-- A "conversation" is just the set of messages between two users.
CREATE TABLE "Message" (
  "id"         TEXT NOT NULL,
  "senderId"   TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "sentAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt"     TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_senderId_receiverId_sentAt_idx"
  ON "Message" ("senderId", "receiverId", "sentAt");
CREATE INDEX "Message_receiverId_readAt_idx"
  ON "Message" ("receiverId", "readAt");

ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
