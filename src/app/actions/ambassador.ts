"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

const ApplySchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().max(40).optional(),
  medicalSchool: z.string().min(2).max(120).trim(),
  yearOfStudy: z.string().min(1).max(40).trim(),
  socialLinks: z.string().max(500).optional(),
  motivation: z.string().min(20).max(2000).trim(),
});

export type AmbassadorApplyState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export async function submitAmbassadorApplicationAction(
  _prev: AmbassadorApplyState,
  formData: FormData
): Promise<AmbassadorApplyState> {
  // 3 applications per IP per day — prevents drive-by spam.
  const ip = await clientIp();
  const rl = rateLimit({
    key: `ambassador:${ip}`,
    limit: 3,
    windowMs: 24 * 60 * 60_000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: "Too many applications from this network. Try again tomorrow.",
    };
  }

  const parsed = ApplySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    medicalSchool: formData.get("medicalSchool"),
    yearOfStudy: formData.get("yearOfStudy"),
    socialLinks: String(formData.get("socialLinks") ?? "").trim() || undefined,
    motivation: formData.get("motivation"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your inputs.",
    };
  }

  // De-dupe: if the same email has applied in the last 60 days, refuse
  // a second active application. Old ones (older than 60d) can re-apply.
  const recent = await prisma.ambassadorApplication.findFirst({
    where: {
      email: parsed.data.email,
      createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60_000) },
    },
    select: { id: true, status: true },
  });
  if (recent) {
    return {
      ok: false,
      error: `You already applied recently — current status: ${recent.status.toLowerCase()}. We'll be in touch.`,
    };
  }

  await prisma.ambassadorApplication.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      medicalSchool: parsed.data.medicalSchool,
      yearOfStudy: parsed.data.yearOfStudy,
      socialLinks: parsed.data.socialLinks,
      motivation: parsed.data.motivation,
    },
  });

  return { ok: true };
}

// ─── Admin: approve / reject ─────────────────────────────────────────

export async function reviewAmbassadorApplicationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) return;

  await prisma.ambassadorApplication.update({
    where: { id },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      reviewerNotes: notes,
    },
  });
  revalidatePath("/admin/ambassadors");
}
