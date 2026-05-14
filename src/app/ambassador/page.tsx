import type { Metadata } from "next";
import AmbassadorForm from "./AmbassadorForm";

export const metadata: Metadata = {
  title: "Become a campus ambassador",
  description:
    "Top medical students at Egyptian medical schools — apply to be a MedExam Hub ambassador. Free Pro plan for the academic year in exchange for posting at your school.",
  openGraph: {
    title: "Become a MedExam Hub campus ambassador",
    description:
      "Free Pro plan in exchange for representing MedExam Hub at your medical school.",
  },
};

export default function AmbassadorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
        Campus ambassadors
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Represent MedExam Hub at your medical school
      </h1>
      <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
        We&apos;re recruiting one ambassador per medical school in Egypt. If
        you&apos;re an active student in study groups, in Telegram / Facebook
        groups for your year, or known among your batchmates as someone
        who shares good study resources — this is for you.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <h2 className="text-base font-semibold">What you get</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Free Pro plan</strong> (700 EGP/mo value) for the
              academic year — 1,500 AI-generated questions/month, mock
              exams, PDF export, file uploads.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Promo code</strong> for your batch giving them 20% off
              any plan — and you earn a referral credit on every signup.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Early access</strong> to new features (mock exam
              templates, specialty content) before public release.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Ambassador badge</strong> on your profile + LinkedIn
              recommendation at the end of the year.
            </span>
          </li>
        </ul>

        <h2 className="mt-6 text-base font-semibold">What we ask</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              Post a weekly &quot;question of the week&quot; from MedExam Hub
              in your batch&apos;s study groups (we provide the
              content).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              Run one 10-minute intro at a study group meeting per
              semester.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              Be available for occasional feedback calls about new
              features (15 min/month).
            </span>
          </li>
        </ul>
      </section>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Apply
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Takes ~3 minutes. We review applications weekly and respond
        within 2 weeks.
      </p>
      <AmbassadorForm />
    </div>
  );
}
