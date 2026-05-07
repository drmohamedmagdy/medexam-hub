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

  type NavItem = { href: string; label: string; emphasis?: "primary" | "admin" | "muted" };
  const mobileItems: NavItem[] = user
    ? [
        { href: "/exam/new", label: t.nav.generate, emphasis: "primary" },
        { href: "/dashboard", label: t.nav.dashboard },
        { href: "/community", label: "Community" },
        { href: "/research", label: "Research" },
        { href: "/statistics", label: "Statistics" },
        { href: "/library", label: t.nav.library },
        { href: "/exams", label: t.dashboard.recentExams },
        { href: "/plans", label: t.nav.plans },
        ...(showAdmin ? ([{ href: "/admin", label: "Admin", emphasis: "admin" }] as NavItem[]) : []),
        { href: "/account/subscription", label: t.account.manageLink },
      ]
    : [
        { href: "/signup", label: t.nav.signup, emphasis: "primary" },
        { href: "/login", label: t.nav.signin },
        { href: "/plans", label: t.nav.plans },
      ];

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
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex items-center justify-center rounded-full p-0.5 dark:bg-white/95 dark:ring-1 dark:ring-white/40">
                <Image
                  src="/logo.webp"
                  alt="MedExam Hub"
                  width={36}
                  height={36}
                  className="h-7 w-7 rounded-full sm:h-8 sm:w-8"
                  priority
                />
              </span>
              <span className="text-sm sm:text-base">MedExam Hub</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-5 text-sm md:flex lg:gap-6">
              <Link href="/plans" className="hover:text-blue-600">{t.nav.plans}</Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="hover:text-blue-600">{t.nav.dashboard}</Link>
                  <Link href="/community" className="hover:text-blue-600">Community</Link>
                  <Link href="/research" className="hover:text-blue-600">Research</Link>
                  <Link href="/statistics" className="hover:text-blue-600">Statistics</Link>
                  <Link href="/library" className="hover:text-blue-600">{t.nav.library}</Link>
                  {showAdmin && (
                    <Link href="/admin" className="font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/exam/new"
                    className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    {t.nav.generate}
                  </Link>
                  <NotificationBell unread={unreadCount} />
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {t.nav.signout}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-blue-600">{t.nav.signin}</Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    {t.nav.signup}
                  </Link>
                </>
              )}
              <LanguageSwitcher current={locale} />
            </div>

            {/* Mobile cluster: signed-out CTAs + language + hamburger */}
            <div className="flex items-center gap-1 md:hidden">
              {!user && (
                <>
                  <Link
                    href="/login"
                    className="px-2 py-1 text-xs font-medium text-zinc-700 hover:text-blue-600 dark:text-zinc-300"
                  >
                    {t.nav.signin}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    {t.nav.signup}
                  </Link>
                </>
              )}
              {user && <NotificationBell unread={unreadCount} />}
              <LanguageSwitcher current={locale} />
              <MobileNav items={mobileItems} signedIn={!!user} signoutLabel={t.nav.signout} />
            </div>
          </nav>
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
