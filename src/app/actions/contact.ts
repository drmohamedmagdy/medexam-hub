"use server";

import { z } from "zod";
import { Resend } from "resend";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type ContactState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const SUPPORT_EMAIL = "info@medexamhub.org";

const Schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  subject: z.enum(["billing", "exam-content", "feature", "partnership", "other"]),
  message: z.string().min(10).max(4000),
});

const SUBJECT_LABELS: Record<z.infer<typeof Schema>["subject"], string> = {
  billing: "Account / billing",
  "exam-content": "Exam content issue",
  feature: "Feature request",
  partnership: "Partnership / institutional",
  other: "Other",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = Schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Please check your name, email, and message.",
    };
  }

  // 5 submissions per hour per IP — generous for a real conversation,
  // tight enough to kill scripted spam.
  const hdr = await headers();
  const ip = clientIp({ headers: hdr } as unknown as Request);
  const rl = rateLimit({
    key: `contact:${ip}`,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many messages. Try again in ${rl.retryAfterSec}s.`,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Fall back to a clean error when the env is missing in dev.
    return {
      ok: false,
      error:
        "Email service isn't configured. Please WhatsApp us or email info@medexamhub.org directly.",
    };
  }
  const resend = new Resend(apiKey);

  const subjectLabel = SUBJECT_LABELS[parsed.data.subject];
  const html = `
    <h2 style="margin:0 0 16px;font-size:18px;">New contact form submission</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(parsed.data.name)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(parsed.data.email)}</td></tr>
      <tr><td><strong>Subject</strong></td><td>${escapeHtml(subjectLabel)}</td></tr>
    </table>
    <h3 style="margin:18px 0 6px;font-size:14px;">Message</h3>
    <div style="white-space:pre-wrap;border-left:3px solid #cbd5e1;padding:8px 12px;background:#f8fafc;color:#334155;font-size:14px;">${escapeHtml(parsed.data.message)}</div>
    <p style="margin-top:18px;font-size:12px;color:#888;">Reply directly to this email — replies go to ${escapeHtml(parsed.data.email)}.</p>
  `;

  const from = process.env.EMAIL_FROM || "MedExam Hub <info@medexamhub.org>";

  try {
    const { error } = await resend.emails.send({
      from,
      to: [SUPPORT_EMAIL],
      replyTo: parsed.data.email, // so hitting Reply lands at the user
      subject: `[Contact] ${subjectLabel} — ${parsed.data.name}`,
      html,
    });
    if (error) {
      return {
        ok: false,
        error: "Sorry — couldn't send your message. Please email us directly.",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Sorry — couldn't send your message. Please email us directly.",
    };
  }

  return { ok: true };
}
