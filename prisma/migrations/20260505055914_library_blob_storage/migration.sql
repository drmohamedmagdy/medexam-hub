/*
  Warnings:

  - You are about to drop the column `fileData` on the `LibraryResource` table. All the data in the column will be lost.
  - Added the required column `filePathname` to the `LibraryResource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `LibraryResource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LibraryResource" DROP COLUMN "fileData",
ADD COLUMN     "filePathname" TEXT NOT NULL,
ADD COLUMN     "fileUrl" TEXT NOT NULL;
