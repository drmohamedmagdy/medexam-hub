-- BroadcastLog: audit trail for posts to our Telegram channel.
-- Written from both the daily cron (kind='qotd_auto') and the admin
-- broadcast form (kind='admin_manual'). ok=false rows surface delivery
-- failures so the admin can retry.
CREATE TABLE "BroadcastLog" (
  "id"                TEXT NOT NULL,
  "kind"              TEXT NOT NULL,
  "text"              TEXT NOT NULL,
  "imageUrl"          TEXT,
  "telegramMessageId" INTEGER,
  "ok"                BOOLEAN NOT NULL DEFAULT true,
  "errorMessage"      TEXT,
  "sentBy"            TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BroadcastLog_createdAt_idx" ON "BroadcastLog"("createdAt");
