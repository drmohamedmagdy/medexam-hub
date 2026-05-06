-- Track when a public-group post triggered a real-time fan-out email,
-- so the per-group 30-min throttle can find recently-announced posts.

ALTER TABLE "Post" ADD COLUMN "groupAnnouncedAt" TIMESTAMP(3);

CREATE INDEX "Post_groupId_groupAnnouncedAt_idx"
  ON "Post"("groupId", "groupAnnouncedAt");
