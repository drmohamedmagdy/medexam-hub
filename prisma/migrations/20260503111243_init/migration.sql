-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'STUDENT', 'INTERN', 'RESIDENT', 'SPECIALIST', 'CONSULTANT', 'BOARD');

-- CreateEnum
CREATE TYPE "ExamMode" AS ENUM ('PRACTICE', 'EXAM');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('GENERATING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planStartedAt" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),
    "planCancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "specialty" TEXT,
    "topic" TEXT,
    "examType" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "mode" "ExamMode" NOT NULL DEFAULT 'PRACTICE',
    "status" "ExamStatus" NOT NULL DEFAULT 'GENERATING',
    "numQuestions" INTEGER NOT NULL,
    "timeLimitSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scorePct" DOUBLE PRECISION,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "learningPoint" TEXT,
    "selectedId" TEXT,
    "isCorrect" BOOLEAN,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "yearMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymobOrderId" TEXT,
    "paymobTxId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "Exam_userId_createdAt_idx" ON "Exam"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Question_examId_orderIndex_key" ON "Question"("examId", "orderIndex");

-- CreateIndex
CREATE INDEX "UsageLog_userId_yearMonth_idx" ON "UsageLog"("userId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymobOrderId_key" ON "PaymentOrder"("paymobOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymobTxId_key" ON "PaymentOrder"("paymobTxId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
