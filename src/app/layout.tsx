import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import WhatsAppButton from "@/components/WhatsAppButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileNav from "@/components/MobileNav";
import NotificationBell from "@/components/NotificationBell";
import { getUnreadCount } from "@/lib/notifications";
import { isRtl } from "@/lib/i18n";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import { isAdmin } from "@/lib/admin";
import { NAV_COLOR_DESKTOP, type NavColor } from "@/lib/nav-colors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedExam Hub — AI-powered medical exam prep",
  description:
    "Free medical library plus AI-generated exams across specialties, difficulties, and topics.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getTranslations(locale);
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const showAdmin = user ? isAdmin(user) : false;
  // Defensive: if the Notification table is missing or any other DB issue
  // arises, never crash the whole app shell. The bell just shows 0.
  const unreadCount = user
    ? await getUnreadCount(user.id).catch(() => 0)
    : 0;

  type NavItem = {
    href: string;
    label: string;
    emphasis?: "primary" | "admin" | "muted";
    color?: NavColor;
  };
  const mobileItems: NavItem[] = user
    ? [
        { href: "/exam/new", label: t.nav.generate, emphasis: "primary" },
        { href: "/plans", label: t.nav.plans, color: "indigo" },
        { href: "/dashboard", label: t.nav.dashboard, color: "blue" },
        { href: "/research", label: "Research & Stats", color: "violet" },
        { href: "/community", label: "Community", color: "rose" },
        { href: "/library", label: t.nav.library, color: "emerald" },
        ...(showAdmin ? ([{ href: "/admin", label: "Admin", emphasis: "admin" }] as NavItem[]) : []),
        { href: "/account/subscription", label: t.account.manageLink, color: "zinc" },
      ]
    : [
        { href: "/signup", label: t.nav.signup, emphasis: "primary" },
        { href: "/login", label: t.nav.signin, color: "blue" },
        { href: "/plans", label: t.nav.plans, color: "indigo" },
      ];

  const pill = "rounded-full px-4 py-2 text-sm font-semibold transition";

  return (
    <html lang={locale} dir={dir} className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* Strip browser-extension-injected attributes (Bitdefender's bis_skin_checked, etc.)
            before React hydrates. Dev-only noise; does not affect functionality. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=function(){document.querySelectorAll('[bis_skin_checked],[bis_register],[__processed_]').forEach(function(e){e.removeAttribute('bis_skin_checked');e.removeAttribute('bis_register');});};try{new MutationObserver(s).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['bis_skin_checked','bis_register']});s();}catch(_){};})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800/60">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            {/* Top row: logo + wordmark on the left, action cluster on the right */}
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                title="Back to home"
                aria-label="MedExam Hub — back to home"
                className="flex items-center gap-3 transition hover:opacity-90"
              >
                <Image
                  src="/logo.webp"
                  alt=""
                  width={72}
                  height={72}
                  className="h-12 w-auto sm:h-16"
                  priority
                />
                <span className="whitespace-nowrap text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">
                  MedExam Hub
                </span>
              </Link>

              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      href="/exam/new"
                      className="hidden rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 md:inline-flex"
                    >
                      {t.nav.generate}
                    </Link>
                    <NotificationBell unread={unreadCount} />
                    <form action={logoutAction} className="hidden md:block">
                      <button
                        type="submit"
                        className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        {t.nav.signout}
                      </button>
                    </form>
                    <LanguageSwitcher current={locale} />
                    <MobileNav
                      items={mobileItems}
                      signedIn={true}
                      signoutLabel={t.nav.signout}
                    />
                  </>
                ) : (
                  <>
                    <Link
                      href="/plans"
                      className={`hidden md:inline-flex ${pill} ${NAV_COLOR_DESKTOP.indigo}`}
                    >
                      {t.nav.plans}
                    </Link>
                    <Link
                      href="/login"
                      className="text-sm font-semibold text-zinc-700 hover:text-blue-600 dark:text-zinc-300"
                    >
                      {t.nav.signin}
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 md:px-5"
                    >
                      {t.nav.signup}
                    </Link>
                    <LanguageSwitcher current={locale} />
                  </>
                )}
              </div>
            </div>

            {/* Bottom row: navigation pills (signed-in users, desktop only). */}
            {user && (
              <nav className="mt-3 hidden flex-wrap items-center gap-2 text-sm md:flex lg:gap-2.5">
                <Link href="/plans" className={`${pill} ${NAV_COLOR_DESKTOP.indigo}`}>
                  {t.nav.plans}
                </Link>
                <Link href="/dashboard" className={`${pill} ${NAV_COLOR_DESKTOP.blue}`}>
                  {t.nav.dashboard}
                </Link>
                <Link href="/research" className={`${pill} ${NAV_COLOR_DESKTOP.violet}`}>
                  Research &amp; Stats
                </Link>
                <Link href="/community" className={`${pill} ${NAV_COLOR_DESKTOP.rose}`}>
                  Community
                </Link>
                <Link href="/library" className={`${pill} ${NAV_COLOR_DESKTOP.emerald}`}>
                  {t.nav.library}
                </Link>
                {showAdmin && (
                  <Link href="/admin" className={`${pill} ${NAV_COLOR_DESKTOP.amber}`}>
                    Admin
                  </Link>
                )}
                <Link
                  href="/account/subscription"
                  className={`${pill} ${NAV_COLOR_DESKTOP.zinc}`}
                >
                  {t.account.manageLink}
                </Link>
              </nav>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 pb-24 dark:border-slate-800/60 sm:pb-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-xs text-zinc-500 sm:px-6 sm:flex-row sm:justify-between">
            <p className="text-center sm:text-start">{t.footer.disclaimer}</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.about}</Link>
              <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.contact}</Link>
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.privacy}</Link>
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.terms}</Link>
              <Link href="/disclaimer" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.medicalDisclaimer}</Link>
            </nav>
          </div>
        </footer>
        <WhatsAppButton />
      </body>
    </html>
  );
}
