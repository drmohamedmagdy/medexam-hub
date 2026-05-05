-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT_NOTES');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "questionFormat" "QuestionFormat" NOT NULL DEFAULT 'MCQ';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "modelAnswer" TEXT,
ADD COLUMN     "selectedText" TEXT;
