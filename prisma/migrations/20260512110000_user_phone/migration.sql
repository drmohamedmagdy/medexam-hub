-- AlterTable: User.phone holds the customer's billing phone number, used
-- by the Paymob Intention API. Optional because legacy users may not
-- have it yet — we prompt for it at checkout when missing.
ALTER TABLE "User"
ADD COLUMN "phone" TEXT;
