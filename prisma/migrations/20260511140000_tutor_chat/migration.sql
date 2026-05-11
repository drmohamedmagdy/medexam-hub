-- AI tutor chat: per-question follow-up conversations. After grading,
-- the user can ask the AI to explain why the correct answer is right,
-- generate similar variants, dive into pathophysiology, etc. One chat
-- per (user, question) so returning to a question continues the same
-- thread.
CREATE TABLE "TutorChat" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TutorChat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TutorChat_userId_questionId_key"
  ON "TutorChat" ("userId", "questionId");
CREATE INDEX "TutorChat_userId_updatedAt_idx"
  ON "TutorChat" ("userId", "updatedAt");

ALTER TABLE "TutorChat" ADD CONSTRAINT "TutorChat_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TutorChat" ADD CONSTRAINT "TutorChat_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TutorMessage" (
  "id"        TEXT NOT NULL,
  "chatId"    TEXT NOT NULL,
  -- "user" | "assistant"
  "role"      TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TutorMessage_chatId_createdAt_idx"
  ON "TutorMessage" ("chatId", "createdAt");

ALTER TABLE "TutorMessage" ADD CONSTRAINT "TutorMessage_chatId_fkey"
  FOREIGN KEY ("chatId") REFERENCES "TutorChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
