-- Add REFUNDED to PaymentStatus enum so the admin refund action has
-- somewhere to write to. Postgres-safe: ALTER TYPE ADD VALUE is
-- non-blocking and runs in its own transaction (must NOT be inside an
-- application transaction block, which is fine for migrate deploy).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
