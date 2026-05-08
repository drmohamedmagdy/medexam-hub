import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import { findUserByReferralCode } from "@/lib/credits";
import AuthIntroPanel from "@/components/AuthIntroPanel";
import { resolveIntroVideo } from "@/lib/intro-video";
import SignupForm from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; next?: string }>;
}) {
  const [user, locale, sp] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    searchParams,
  ]);
  const refCode = (sp.ref ?? "").trim().toUpperCase().slice(0, 40) || null;
  const nextRaw = (sp.next ?? "").trim();
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw.slice(0, 500) : null;
  if (user) redirect(next ?? "/dashboard");

  const t = getTranslations(locale);
  const referrer = refCode ? await findUserByReferralCode(refCode) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        {/* Form column */}
        <div className="order-2 lg:order-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.signup.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t.signup.subtitle}
          </p>

          {referrer && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                🎁 You were invited by {referrer.name?.split(" ")[0] ?? referrer.email.split("@")[0]}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                They&apos;ll get credits when you sign up and pick a paid plan — and you&apos;ll start with a welcome bonus.
              </p>
            </div>
          )}

          <SignupForm
            referralCode={referrer ? refCode : null}
            next={next}
            labels={{
              name: t.signup.name,
              email: t.signup.email,
              password: t.signup.password,
              passwordHint: t.signup.passwordHint,
              submit: t.signup.submit,
              submitLoading: t.signup.submitLoading,
            }}
          />
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
            {t.signup.haveAccount}{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              {t.signup.signin}
            </Link>
          </p>
        </div>

        {/* Intro / video column — appears above form on mobile */}
        <div className="order-1 lg:order-2">
          <AuthIntroPanel
            video={resolveIntroVideo("signup")}
            heading="See what you'll get"
            subheading="A 60-second tour of the AI exam generator, Research Assistant, Statistics workspace, and free library."
          />
        </div>
      </div>
    </div>
  );
}
