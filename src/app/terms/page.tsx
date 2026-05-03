import Link from "next/link";

export const metadata = { title: "Terms of Service — MedExam Hub" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-zinc dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-sm text-zinc-500">Last updated: 2026-05-03</p>

      <p>
        By creating an account or using MedExam Hub (&ldquo;the service&rdquo;), you agree to these
        Terms.
      </p>

      <h2>1. Use of the service</h2>
      <p>
        MedExam Hub generates AI-based medical exam questions for educational and self-study
        purposes only. You must be at least 18 years old, or have parental/guardian consent.
      </p>

      <h2>2. Educational use only</h2>
      <p>
        AI-generated questions and explanations are for study and exam preparation. They are
        <strong> not medical advice</strong> and must not be used to diagnose, treat, or manage
        actual patients. Always verify clinical information against authoritative sources
        (textbooks, peer-reviewed guidelines, your institution&apos;s protocols).
      </p>

      <h2>3. Subscriptions and billing</h2>
      <ul>
        <li>Free trial: 1 exam per month.</li>
        <li>Paid plans bill monthly via Paymob in EGP.</li>
        <li>Subscriptions do not auto-renew at this time. You manually renew before expiry to maintain paid access.</li>
        <li>Cancellation: you keep access until the end of the current billing period.</li>
        <li>Refunds: contact us within 7 days of purchase if the service didn&apos;t work as described.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Resell or redistribute generated questions commercially without permission.</li>
        <li>Use the service to harass, harm, or violate the rights of others.</li>
        <li>Attempt to reverse-engineer, scrape, or overload the service.</li>
        <li>Upload content you don&apos;t have rights to (when file upload becomes available).</li>
      </ul>

      <h2>5. Intellectual property</h2>
      <p>
        The platform&apos;s design, code, and brand are owned by MedExam Hub. AI-generated
        questions are licensed to you for personal study; you may print or save them for your own
        use.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. We are not liable for any clinical decision
        made based on AI-generated content. Your maximum recourse is a refund of fees paid in the
        previous billing month.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms. You may delete your account
        at any time.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms. Continued use after notification of changes constitutes
        acceptance.
      </p>

      <p>
        See also our <Link href="/privacy" className="text-blue-600 underline">Privacy Policy</Link>
        {" "}and <Link href="/disclaimer" className="text-blue-600 underline">Medical Disclaimer</Link>.
      </p>
    </article>
  );
}
