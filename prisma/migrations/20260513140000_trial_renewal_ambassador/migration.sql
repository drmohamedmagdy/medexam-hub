-- New User fields supporting the 7-day signup trial + the pre-renewal
-- value email send-once guard.
ALTER TABLE "User"
  ADD COLUMN "trialEndsAt"           TIMESTAMP(3),
  ADD COLUMN "trialUsed"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastPreRenewalSentAt"  TIMESTAMP(3);

-- AmbassadorApplication captures the public /ambassador form. Status
-- moves PENDING → APPROVED / REJECTED by an admin in /admin/ambassadors.
CREATE TABLE "AmbassadorApplication" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "phone"           TEXT,
  "medicalSchool"   TEXT NOT NULL,
  "yearOfStudy"     TEXT NOT NULL,
  "socialLinks"     TEXT,
  "motivation"      TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt"      TIMESTAMP(3),
  "reviewedBy"      TEXT,
  "reviewerNotes"   TEXT,
  "linkedUserId"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AmbassadorApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AmbassadorApplication_status_createdAt_idx" ON "AmbassadorApplication"("status", "createdAt");
CREATE INDEX "AmbassadorApplication_email_idx" ON "AmbassadorApplication"("email");
