export const metadata = { title: "Contact — MedExam Hub" };

const WHATSAPP = "https://wa.me/201226218004";
const EMAIL = "info@medexamhub.com";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose prose-zinc dark:prose-invert sm:px-6 sm:py-12">
      <h1>Contact</h1>
      <p>We&apos;re a small team — fastest way to reach us is WhatsApp.</p>

      <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            WhatsApp (fastest)
          </div>
          <div className="mt-2 text-base font-medium">+20 122 621 8004</div>
          <p className="mt-1 text-sm text-zinc-500">
            Questions about plans, payments, or which exam format to pick.
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
          <p className="mt-1 text-sm text-zinc-500">For longer questions and feedback.</p>
        </a>
      </div>

      <h2 className="mt-10">When to reach out</h2>
      <ul>
        <li>Account / billing problems.</li>
        <li>Suspected errors in AI-generated questions (please paste the question + the issue).</li>
        <li>Feature requests for exams or specialties not yet covered.</li>
        <li>Partnership / institutional pricing inquiries.</li>
      </ul>
    </article>
  );
}
