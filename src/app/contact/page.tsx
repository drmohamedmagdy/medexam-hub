import ContactForm from "./ContactForm";

export const metadata = { title: "Contact — MedExam Hub" };

const WHATSAPP = "https://wa.me/201226218004";
const EMAIL = "info@medexamhub.org";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-slate-400">
        Three ways to reach us — pick whichever works.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            WhatsApp · fastest
          </div>
          <div className="mt-2 text-base font-medium">+20 122 621 8004</div>
          <p className="mt-1 text-sm text-zinc-500">
            Quick questions about plans, payments, or which exam format to pick.
          </p>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Email
          </div>
          <div className="mt-2 text-base font-medium">{EMAIL}</div>
          <p className="mt-1 text-sm text-zinc-500">
            For longer questions and feedback.
          </p>
        </a>
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Send us a message</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Fill in the form and we&apos;ll get back to you at the email you
          provide.
        </p>
        <div className="mt-6">
          <ContactForm />
        </div>
      </section>

      <h2 className="mt-10 text-base font-semibold">When to reach out</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-slate-400">
        <li>Account or billing problems.</li>
        <li>
          Suspected errors in AI-generated questions (paste the question + the
          issue).
        </li>
        <li>Feature requests for exams or specialties not yet covered.</li>
        <li>Partnership or institutional pricing inquiries.</li>
      </ul>
    </div>
  );
}
