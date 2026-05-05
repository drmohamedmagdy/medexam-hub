-- AlterTable
ALTER TABLE "FileUpload"
  ADD COLUMN "summaryText"      TEXT,
  ADD COLUMN "summaryUrl"       TEXT,
  ADD COLUMN "summaryPathname"  TEXT,
  ADD COLUMN "summaryCreatedAt" TIMESTAMP(3);
