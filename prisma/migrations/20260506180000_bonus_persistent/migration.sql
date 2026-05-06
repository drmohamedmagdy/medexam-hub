-- Bonus grants are now a perpetual pool drained only when used,
-- not month-scoped. Add the `consumed` counter and an index on
-- (userId, kind) for the new "available across all months" lookups.

ALTER TABLE "BonusGrant"
  ADD COLUMN "consumed" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "BonusGrant_userId_kind_idx" ON "BonusGrant"("userId", "kind");
