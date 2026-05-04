import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const sp = await searchParams;
  const verifyInvalid = sp.verify === "invalid";
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const locale = await getLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t.login.title}</h1>
      {verifyInvalid && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          That verification link is invalid or expired. Sign in and we&apos;ll send you a fresh one.
        </div>
      )}
      <LoginForm
        labels={{
          email: t.login.email,
          password: t.login.password,
          submit: t.login.submit,
          submitLoading: t.login.submitLoading,
        }}
      />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        {t.login.noAccount}{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          {t.login.signup}
        </Link>
      </p>
    </div>
  );
}
