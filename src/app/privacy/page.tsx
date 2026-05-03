import Link from "next/link";

export const metadata = { title: "Privacy Policy — MedExam Hub" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-zinc dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: 2026-05-03</p>

      <p>
        This Privacy Policy explains how MedExam Hub (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects,
        uses, and protects your information when you use our service.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong>: name, email address, hashed password.</li>
        <li><strong>Subscription data</strong>: plan tier, billing dates, payment-order metadata. We do not see or store credit-card numbers; payments are processed by Paymob.</li>
        <li><strong>Usage data</strong>: exams you generate, your answers, scores, and the topics you select. We use this to compute your performance metrics on the dashboard.</li>
        <li><strong>Technical data</strong>: cookies needed for authentication and language preference.</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To provide the AI exam-generation service you requested.</li>
        <li>To track your monthly quota and bill you correctly.</li>
        <li>To improve our service (anonymous, aggregate analytics).</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>Third parties</h2>
      <ul>
        <li><strong>OpenAI</strong>: receives the prompts we construct (specialty, topic, difficulty, language) to generate questions. No personal account information is sent.</li>
        <li><strong>Paymob</strong>: handles all card data for payments. We receive only payment confirmation and order metadata.</li>
        <li><strong>Hosting provider</strong>: stores our database and serves the website.</li>
      </ul>

      <h2>Your rights</h2>
      <ul>
        <li>Access, correct, or delete your account and data at any time.</li>
        <li>Request a copy of your data in a portable format.</li>
        <li>Withdraw consent for non-essential processing.</li>
      </ul>
      <p>To exercise these rights, contact us via the WhatsApp button or email.</p>

      <h2>Data retention</h2>
      <p>
        We keep your account data while your account is active. If you delete your account, we
        remove personal data within 30 days, except where retention is legally required.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy. Material changes will be communicated via email or in-app
        notification.
      </p>

      <p>
        <Link href="/contact" className="text-blue-600 underline">Contact us</Link> if you have
        questions about your privacy.
      </p>
    </article>
  );
}
