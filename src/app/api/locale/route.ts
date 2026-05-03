import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n";

const Body = z.object({ locale: z.enum(LOCALES) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse("Invalid locale", { status: 400 });

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  return NextResponse.json({ ok: true });
}
