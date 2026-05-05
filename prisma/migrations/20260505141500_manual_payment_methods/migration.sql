-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'VODAFONE_CASH', 'INSTAPAY');

-- AlterTable
ALTER TABLE "PaymentOrder"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD',
  ADD COLUMN "proofRef" TEXT,
  ADD COLUMN "proofNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "PaymentOrder_status_paymentMethod_idx" ON "PaymentOrder"("status", "paymentMethod");
