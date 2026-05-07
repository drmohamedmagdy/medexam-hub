-- One-off top-up purchases. PaymentOrder rows where topupKind is non-null
-- grant bonus units (research_projects / stats_analyses) instead of upgrading
-- the user's plan + expiry on confirmation.
ALTER TABLE "PaymentOrder" ADD COLUMN "topupKind" TEXT;
ALTER TABLE "PaymentOrder" ADD COLUMN "topupAmount" INTEGER NOT NULL DEFAULT 1;
