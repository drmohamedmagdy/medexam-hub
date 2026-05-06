import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import GroupCreateForm from "./GroupCreateForm";

export const metadata = { title: "New group — MedExam Hub" };

export default async function NewGroupPage() {
  await requireUser();
  const locale = await getLocale();
  const t = getTranslations(locale).community;
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/community/groups" className="text-sm text-zinc-500 hover:text-blue-600">
        {t.groupCreateBack}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t.groupCreateTitle}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t.groupCreateSubtitle}</p>
      <GroupCreateForm t={t} />
    </div>
  );
}
