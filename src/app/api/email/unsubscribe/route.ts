import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubToken } from "@/lib/email";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const verified = verifyUnsubToken(token);

  if (!verified) {
    return new NextResponse(
      htmlPage(
        "Invalid unsubscribe link",
        "This unsubscribe link is invalid or expired. Sign in to MedExam Hub and update your email preferences from your account settings."
      ),
      { status: 400, headers: { "content-type": "text/html" } }
    );
  }

  const update =
    verified.category === "marketing"
      ? { emailMarketing: false }
      : { emailReminders: false };

  await prisma.user.update({ where: { id: verified.userId }, data: update });

  const heading = "You're unsubscribed";
  const detail =
    verified.category === "marketing"
      ? "We'll stop sending you marketing and re-engagement emails. Transactional emails (renewal reminders, password resets, payment confirmations) will still come through."
      : "We'll stop sending renewal-reminder emails. Welcome and confirmation emails will still come through.";

  return new NextResponse(htmlPage(heading, detail), {
    headers: { "content-type": "text/html" },
  });
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — MedExam Hub</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#111;line-height:1.6}h1{font-size:22px;margin-bottom:12px}a{color:#2563eb}</style>
  </head><body><h1>${title}</h1><p>${body}</p>
  <p><a href="/dashboard">Go to dashboard</a></p>
  </body></html>`;
}
