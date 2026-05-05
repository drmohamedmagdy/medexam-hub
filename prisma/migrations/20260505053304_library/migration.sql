-- CreateTable
CREATE TABLE "LibraryResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryResource_category_idx" ON "LibraryResource"("category");

-- CreateIndex
CREATE INDEX "LibraryResource_isPublished_createdAt_idx" ON "LibraryResource"("isPublished", "createdAt");
