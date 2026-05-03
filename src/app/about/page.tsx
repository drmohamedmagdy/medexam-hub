import Link from "next/link";

export const metadata = { title: "About — MedExam Hub" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-zinc dark:prose-invert">
      <h1>About MedExam Hub</h1>

      <p>
        MedExam Hub is an AI-powered medical exam-prep platform built for doctors, residents, and
        medical students. We generate clinically-grounded MCQs across the major exam formats —
        USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric, European boards, and more — in 10
        languages, at any difficulty level, with explanations and learning points.
      </p>

      <h2>Who it&apos;s for</h2>
      <ul>
        <li>Medical students preparing for end-of-year and board exams.</li>
        <li>Residents revising for specialty boards (MRCS, MRCP, Egyptian Fellowship, etc.).</li>
        <li>Specialists preparing for fellowship / sub-specialty exams.</li>
        <li>IMGs preparing for licensing (USMLE, PLAB, Prometric, AMC, MCCQE).</li>
        <li>Educators creating practice material for students.</li>
      </ul>

      <h2>How it&apos;s different</h2>
      <ul>
        <li><strong>Format-aware</strong>: USMLE feels like USMLE; MRCS Part B feels like an OSCE; the Egyptian Fellowship feels like the Egyptian Fellowship.</li>
        <li><strong>Language-flexible</strong>: study in your mother tongue. 10 languages including Arabic, Urdu, Persian, and Turkish — important for MENA and international users.</li>
        <li><strong>Specialty-flexible</strong>: 50+ specialties built in, plus you can specify any topic the AI understands.</li>
        <li><strong>Pay in EGP via Paymob</strong>: built for the Egyptian and MENA market first.</li>
      </ul>

      <h2>Roadmap</h2>
      <p>Coming soon:</p>
      <ul>
        <li>File upload — generate exams from your own lecture notes / guidelines (Pro and Premium plans).</li>
        <li>AI weakness analyzer — automatic detection of your weak topics with targeted exam recommendations.</li>
        <li>Daily streaks and study goals.</li>
        <li>Free medical library — articles, summaries, and videos by specialty.</li>
      </ul>

      <p>
        See <Link href="/contact" className="text-blue-600 underline">how to reach us</Link>, or
        <Link href="/plans" className="text-blue-600 underline"> see plans</Link>.
      </p>
    </article>
  );
}
