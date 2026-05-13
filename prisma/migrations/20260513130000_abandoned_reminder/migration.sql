-- Track when we last emailed a user a "finish your upgrade" reminder
-- for an abandoned PENDING PaymentOrder. NULL = never reminded.
ALTER TABLE "PaymentOrder"
ADD COLUMN "abandonedReminderSentAt" TIMESTAMP(3);
