import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CertificateCard from "@/components/certificate/CertificateCard";
import ShareCertificate from "@/components/certificate/ShareCertificate";
import { detectCertLanguage } from "@/components/certificate/detectLanguage";

// Mock-exam Certificate of Completion. Bar is 70% — full-length timed
// mocks are harder to ace than a single exam (80% threshold there),
// so we set the certificate threshold lower.

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

  // Re-derive the overall score the same way the results page does so a
  // re-graded question is reflected here automatically.
  const allQs = mock.exams.flatMap((e) => e.questions);
  const gradable = allQs.filter((q) => q.format !== "SHORT_NOTES" && q.isCorrect !== null);
  const correct = gradable.filter((q) => q.isCorrect === true).length;
  const score = gradable.length === 0 ? 0 : Math.round((correct / gradable.length) * 100);
  const totalQuestions = mock.exams.reduce((s, e) => s + e.numQuestions, 0);

  if (score < PASS_THRESHOLD) return notFound();

  const completedAt = mock.completedAt ?? new Date();
  const certNumber = `CERT-${completedAt.getFullYear()}-${mock.id.slice(0, 8).toUpperCase()}`;
  const recipientName = user.name?.trim() || user.email.split("@")[0];
  // Cert language follows the mock template's name (set when generated)
  // plus the user's name as a fallback.
  const language = detectCertLanguage(mock.templateLabel, recipientName);

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
          }
          @page { margin: 0; size: A4 landscape; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/mock/${mock.id}/results`}
            className="text-sm text-zinc-500 hover:text-blue-600"
          >
            ← Back to results
          </Link>
        </div>

        <CertificateCard
          language={language}
          recipientName={recipientName}
          achievementTitle={mock.templateLabel}
          achievementSubline={language === "ar" ? "امتحان تجريبي كامل" : "Full-length mock exam"}
          scorePct={score}
          questionCount={totalQuestions}
          completedAt={completedAt}
          certNumber={certNumber}
          variant="completion"
        />

        <ShareCertificate
          targetId="cert-card"
          fileName={`MedExamHub-Certificate-${certNumber}`}
          shareText={`I just passed ${mock.templateLabel} at ${score}% on MedExam Hub 🎓`}
        />
      </div>
    </>
  );
}
