import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return (LOCALES as string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
}

export { getTranslations } from "@/lib/i18n";
