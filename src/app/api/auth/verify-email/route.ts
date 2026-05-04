import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyVerifyToken } from "@/lib/email";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  const parsed = verifyVerifyToken(token);
  if (!parsed) {
    // Redirect to a friendly error page rather than dumping JSON
    return NextResponse.redirect(new URL("/login?verify=invalid", url));
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, emailVerifiedAt: true },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?verify=invalid", url));
  }

  // Idempotent: if already verified, just send them in
  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return NextResponse.redirect(new URL("/dashboard?verify=ok", url));
}
