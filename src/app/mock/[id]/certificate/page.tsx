import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PrintButton from "./PrintButton";

// Certificate of completion for mock exams scored ≥70%. Renders a
// print-friendly page; users click "Print / Save as PDF" to get a
// downloadable certificate they can save, share on LinkedIn, or attach
// to a CV. No PDF library — same browser-print trick as the invoice.

const PASS_THRESHOLD = 70;

export const metadata = { title: "Certificate — MedExam Hub" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);

  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: {
      exams: {
        select: {
          status: true,
          scorePct: true,
          numQuestions: true,
          questions: {
            select: { isCorrect: true, format: true },
          },
        },
      },
    },
  });
  if (!mock || mock.userId !== user.id) return notFound();
  if (mock.status !== "completed") return notFound();

  // Recompute overall score the same way the results page does (sum of
  // gradable answers / total gradable). Re-deriving rather than caching
  // means a question regrade is reflected here automatically.
  const allQs = mock.exams.flatMap((e) => e.questions);
  const gradable = allQs.filter((q) => q.format !== "SHORT_NOTES" && q.isCorrect !== null);
  const correct = gradable.filter((q) => q.isCorrect === true).length;
  const score =
    gradable.length === 0 ? 0 : Math.round((correct / gradable.length) * 100);
  const totalQuestions = mock.exams.reduce((s, e) => s + e.numQuestions, 0);

  // No certificate below the pass threshold. Surface a friendly 404
  // rather than a "you failed" message — same code path the user gets
  // if the URL is wrong, so we don't shame them.
  if (score < PASS_THRESHOLD) return notFound();

  const completedAt = mock.completedAt ?? new Date();
  const certNumber = `CERT-${completedAt.getFullYear()}-${mock.id.slice(0, 8).toUpperCase()}`;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const recipientName = user.name?.trim() || user.email.split("@")[0];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .cert-card {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: none !important;
            border-width: 6px !important;
          }
          @page { margin: 0; size: A4 landscape; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/mock/${mock.id}/results`}
            className="text-sm text-zinc-500 hover:text-blue-600"
          >
            ← Back to results
          </Link>
          <PrintButton />
        </div>

        <div
          className="cert-card relative aspect-[1.414/1] overflow-hidden rounded-lg border-[6px] border-double border-blue-700 bg-gradient-to-br from-blue-50 via-white to-amber-50 px-6 py-8 shadow-xl sm:px-12 sm:py-12"
        >
          {/* Corner ornaments */}
          <div className="absolute left-6 top-6 grid h-12 w-12 place-items-center rounded-full bg-blue-700 text-2xl text-white">
            🎓
          </div>
          <div className="absolute right-6 top-6 text-end text-[10px] text-zinc-500">
            <p className="font-semibold uppercase tracking-[0.18em]">
              Certificate no.
            </p>
            <p className="font-mono">{certNumber}</p>
          </div>

          {/* Header */}
          <div className="mt-12 text-center sm:mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              MedExam Hub
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Certificate of Completion
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs text-zinc-600 sm:text-sm">
              This certifies that the candidate named below has successfully
              completed the mock examination with a passing score.
            </p>
          </div>

          {/* Recipient */}
          <div className="mt-8 text-center sm:mt-10">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Awarded to
            </p>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900 sm:text-3xl">
              {recipientName}
            </p>
          </div>

          {/* Exam details */}
          <div className="mt-8 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              For successfully completing
            </p>
            <p className="mt-1 text-base font-semibold sm:text-lg">
              {mock.templateLabel}
            </p>
            <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Score
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                  {score}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Questions
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-zinc-800">
                  {totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Completed
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">
                  {fmtDate(completedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-end justify-between border-t border-zinc-300 pt-5 sm:mt-12">
            <div className="text-start">
              <p className="font-serif text-base italic text-zinc-700">
                MedExam Hub
              </p>
              <p className="text-[10px] text-zinc-500">
                AI-powered medical exam preparation
              </p>
              <p className="text-[10px] text-zinc-500">Cairo, Egypt</p>
            </div>
            <div className="text-end">
              <p className="font-serif text-base italic text-zinc-700">
                Verified
              </p>
              <p className="text-[10px] text-zinc-500">
                medexamhub.org/verify
              </p>
              <p className="font-mono text-[9px] text-zinc-400">
                {certNumber}
              </p>
            </div>
          </div>
        </div>

        <p className="no-print mt-6 text-center text-xs text-zinc-500">
          Tip: in the Print dialog, choose <span className="font-semibold">Save as PDF</span>{" "}
          and <span className="font-semibold">Landscape</span> orientation for the best result.
        </p>
      </div>
    </>
  );
}
