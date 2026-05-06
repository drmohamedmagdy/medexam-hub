-- Bonus quota grants from credit redemption (extra questions, extra files).
CREATE TABLE "BonusGrant" (
  "id"           TEXT      NOT NULL,
  "userId"       TEXT      NOT NULL,
  "kind"         TEXT      NOT NULL,
  "amount"       INTEGER   NOT NULL,
  "creditsSpent" INTEGER   NOT NULL,
  "yearMonth"    TEXT      NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BonusGrant_userId_yearMonth_kind_idx"
  ON "BonusGrant"("userId", "yearMonth", "kind");

ALTER TABLE "BonusGrant"
  ADD CONSTRAINT "BonusGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
