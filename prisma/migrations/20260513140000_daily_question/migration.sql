-- DailyQuestion + DailyQuestionAttempt — backs the /qotd "Question of the
-- Day" feature. One row per calendar day in DailyQuestion; one attempt
-- per user per QOTD enforced by a unique compound key.

CREATE TABLE "DailyQuestion" (
  "id" TEXT NOT NULL,
  "publishDate" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "prompt" TEXT NOT NULL,
  "format" "QuestionFormat" NOT NULL DEFAULT 'MCQ',
  "optionsJson" TEXT NOT NULL,
  "correctId" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "learningPoint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyQuestion_publishDate_key" ON "DailyQuestion"("publishDate");

CREATE TABLE "DailyQuestionAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyQuestionId" TEXT NOT NULL,
  "selectedId" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyQuestionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyQuestionAttempt_userId_dailyQuestionId_key"
  ON "DailyQuestionAttempt"("userId", "dailyQuestionId");

CREATE INDEX "DailyQuestionAttempt_userId_answeredAt_idx"
  ON "DailyQuestionAttempt"("userId", "answeredAt");

ALTER TABLE "DailyQuestionAttempt"
  ADD CONSTRAINT "DailyQuestionAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyQuestionAttempt"
  ADD CONSTRAINT "DailyQuestionAttempt_dailyQuestionId_fkey"
  FOREIGN KEY ("dailyQuestionId") REFERENCES "DailyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
