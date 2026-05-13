-- AlterTable: PaymentOrder.durationMonths controls how many months of plan
-- access a successful order grants. Default 1 preserves prior behaviour for
-- historic rows (all of which were 30-day grants).
ALTER TABLE "PaymentOrder"
ADD COLUMN "durationMonths" INTEGER NOT NULL DEFAULT 1;
