-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "sourceFileId" TEXT;

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileUpload_userId_yearMonth_idx" ON "FileUpload"("userId", "yearMonth");

-- CreateIndex
CREATE INDEX "FileUpload_userId_createdAt_idx" ON "FileUpload"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "FileUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
