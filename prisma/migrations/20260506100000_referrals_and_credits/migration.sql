-- Add referral + credit columns to User
ALTER TABLE "User"
  ADD COLUMN "referralCode"     TEXT,
  ADD COLUMN "referredByUserId" TEXT,
  ADD COLUMN "creditsBalance"   INTEGER NOT NULL DEFAULT 0;

-- Add credit fields to PaymentOrder
ALTER TABLE "PaymentOrder"
  ADD COLUMN "creditsApplied" INTEGER NOT NULL DEFAULT 0;

-- New CreditTransaction table
CREATE TABLE "CreditTransaction" (
  "id"             TEXT      NOT NULL,
  "userId"         TEXT      NOT NULL,
  "amount"         INTEGER   NOT NULL,
  "type"           TEXT      NOT NULL,
  "description"    TEXT,
  "referredUserId" TEXT,
  "paymentOrderId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditTransaction_userId_createdAt_idx"
  ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX "CreditTransaction_paymentOrderId_idx"
  ON "CreditTransaction"("paymentOrderId");

ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_referredByUserId_fkey"
  FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- Backfill: give every existing user a referral code derived from their cuid.
-- Using the FIRST 8 chars of cuid (timestamp-based prefix) keeps codes short
-- and unique; uppercased for visual distinction.
UPDATE "User"
SET "referralCode" = UPPER(SUBSTRING("id", 1, 8))
WHERE "referralCode" IS NULL;

-- Backfill: welcome credits per current plan + ledger row for transparency.
-- FREE = 10, BASIC = 50, PRO = 100, PREMIUM = 200.
UPDATE "User"
SET "creditsBalance" = CASE plan
  WHEN 'FREE'    THEN 10
  WHEN 'BASIC'   THEN 50
  WHEN 'PRO'     THEN 100
  WHEN 'PREMIUM' THEN 200
END;

INSERT INTO "CreditTransaction" (id, "userId", amount, type, description, "createdAt")
SELECT
  'seed_' || SUBSTRING(MD5(RANDOM()::text || u.id), 1, 20),
  u.id,
  CASE u.plan
    WHEN 'FREE'    THEN 10
    WHEN 'BASIC'   THEN 50
    WHEN 'PRO'     THEN 100
    WHEN 'PREMIUM' THEN 200
  END,
  'signup_bonus',
  'Welcome bonus — ' || u.plan || ' plan',
  CURRENT_TIMESTAMP
FROM "User" u;
