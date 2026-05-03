import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const locale = await getLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t.signup.title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.signup.subtitle}</p>
      <SignupForm
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
  );
}
