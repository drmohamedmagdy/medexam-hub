-- ScheduledBroadcast: queue of future Telegram channel posts.
-- Cron at /api/cron/scheduled-broadcasts drains the queue 3x daily.
CREATE TABLE "ScheduledBroadcast" (
  "id"             TEXT NOT NULL,
  "scheduledFor"   TIMESTAMP(3) NOT NULL,
  "kind"           TEXT NOT NULL,
  "text"           TEXT NOT NULL,
  "imageUrl"       TEXT,
  "ctaLabel"       TEXT,
  "ctaUrl"         TEXT,
  "sent"           BOOLEAN NOT NULL DEFAULT false,
  "sentAt"         TIMESTAMP(3),
  "errorMessage"   TEXT,
  "broadcastLogId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduledBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledBroadcast_sent_scheduledFor_idx" ON "ScheduledBroadcast"("sent", "scheduledFor");
CREATE INDEX "ScheduledBroadcast_scheduledFor_idx" ON "ScheduledBroadcast"("scheduledFor");
