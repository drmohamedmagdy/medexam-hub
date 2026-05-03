-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailMarketing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastReengagementAt" TIMESTAMP(3),
ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_userId_sentAt_idx" ON "EmailLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_category_sentAt_idx" ON "EmailLog"("category", "sentAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
