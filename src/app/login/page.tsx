import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const locale = await getLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t.login.title}</h1>
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
