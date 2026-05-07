-- Add the dedicated RESEARCHER plan: full research + statistics access.
-- Premium keeps research/stats access but pays per-section credits.
-- Pro / Basic / Free are blocked from research entirely.
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'RESEARCHER';
