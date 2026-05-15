export const metadata = { title: "Refund Policy — MedExam Hub" };

export default function RefundPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert mx-auto max-w-3xl px-6 py-12">
      <h1>Refund Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: 2026-05-10</p>

      <p>
        We want you to be happy with your subscription. If something
        isn&apos;t right, here&apos;s how refunds work on MedExam Hub.
      </p>

      <h2>When you can ask for a refund</h2>
      <ul>
        <li>
          <strong>Within 7 days of payment</strong>, if you have used
          fewer than 10% of your plan&apos;s monthly quota (questions,
          file uploads, research projects, or statistical analyses), you
          can request a full refund.
        </li>
        <li>
          <strong>Technical issues</strong> caused by us that we
          can&apos;t resolve — for example, the AI generator is
          unavailable for an extended period — qualify for a refund or
          credit, prorated to the affected time.
        </li>
        <li>
          <strong>Duplicate or accidental charges</strong> are refunded
          in full once verified.
        </li>
      </ul>

      <h2>When refunds aren&apos;t available</h2>
      <ul>
        <li>
          Refund requests made <strong>more than 7 days</strong> after
          payment.
        </li>
        <li>
          You&apos;ve already used <strong>10% or more</strong> of the
          plan&apos;s monthly quota.
        </li>
        <li>
          Bonus credits, top-ups, and one-off question packs are
          non-refundable once consumed.
        </li>
        <li>
          Promo-discounted purchases are refunded at the discounted
          amount actually paid, never at the original list price.
        </li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email{" "}
        <a href="mailto:info@medexamhub.org">info@medexamhub.org</a> from
        the address on your account, with your payment reference and a
        short note. Refunds are processed back to the original payment
        method via Paymob (Visa / Mastercard or Egyptian mobile wallet)
        and typically take 5–10 business days to appear, depending on
        your provider.
      </p>

      <h2>Plan changes</h2>
      <p>
        Upgrading mid-cycle is prorated against your remaining time.
        Downgrading takes effect at the end of the current billing
        cycle so you don&apos;t lose the time you&apos;ve already paid
        for. Cancelling stops the next renewal — no partial refund of
        the current cycle is issued.
      </p>

      <p className="text-sm text-zinc-500">
        Contact: <a href="mailto:info@medexamhub.org">info@medexamhub.org</a>
        {" · "}MedExam Hub, Cairo, Egypt.
      </p>
    </article>
  );
}
