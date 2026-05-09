-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "videoFilename" TEXT NOT NULL,
    "videoMimeType" TEXT NOT NULL,
    "videoSizeBytes" INTEGER NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoPathname" TEXT NOT NULL,
    "durationSec" INTEGER,
    "thumbnailUrl" TEXT,
    "thumbnailPathname" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_category_idx" ON "Course"("category");

-- CreateIndex
CREATE INDEX "Course_isPublished_createdAt_idx" ON "Course"("isPublished", "createdAt");
