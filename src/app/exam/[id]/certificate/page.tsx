import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CertificateCard from "@/components/certificate/CertificateCard";
import ShareCertificate from "@/components/certificate/ShareCertificate";
import { detectCertLanguage } from "@/components/certificate/detectLanguage";

// Single-exam Certificate of Excellence. Bar is 80% (vs 70% for mock
// exams) — a single exam is shorter and easier to ace than a timed
// full-length mock, so we require a higher score.
//
// Design is rendered by the shared CertificateCard component
// (bilingual EN+AR, signature, stamp). Sharing uses ShareCertificate
// which captures the card DOM as a PNG and shares the image file
// itself, not a URL.

const PASS_THRESHOLD = 80;

export const metadata = { title: "Certificate — MedExam Hub" };

export default async function ExamCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      specialty: true,
      examType: true,
      difficulty: true,
      numQuestions: true,
      scorePct: true,
      status: true,
      submittedAt: true,
      createdAt: true,
    },
  });
  if (!exam || exam.userId !== user.id) return notFound();
  if (exam.status !== "COMPLETED") return notFound();
  if (exam.scorePct === null || exam.scorePct < PASS_THRESHOLD) return notFound();

  const completedAt = exam.submittedAt ?? exam.createdAt;
  const certNumber = `CERT-EX-${completedAt.getFullYear()}-${exam.id.slice(0, 8).toUpperCase()}`;
  const recipientName = user.name?.trim() || user.email.split("@")[0];
  const title = exam.title || `${exam.specialty ?? "General"} exam`;
  const subline = [exam.specialty, exam.examType, exam.difficulty]
    .filter(Boolean)
    .join(" · ");
  // Cert language follows the exam content: Arabic title → Arabic cert.
  // Fallback samples the recipient's name too in case the title's all
  // English but the user is Arabic-speaking.
  const language = detectCertLanguage(exam.title, exam.specialty, recipientName);

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
            href={`/exam/${exam.id}/results`}
            className="text-sm text-zinc-500 hover:text-blue-600"
          >
            ← Back to results
          </Link>
        </div>

        <CertificateCard
          language={language}
          recipientName={recipientName}
          achievementTitle={title}
          achievementSubline={subline || undefined}
          scorePct={exam.scorePct}
          questionCount={exam.numQuestions}
          completedAt={completedAt}
          certNumber={certNumber}
          variant="excellence"
        />

        <ShareCertificate
          targetId="cert-card"
          fileName={`MedExamHub-Certificate-${certNumber}`}
          shareText={`I just scored ${Math.round(exam.scorePct)}% on ${title} on MedExam Hub 🏆 — AI-generated medical exam prep.`}
        />
      </div>
    </>
  );
}
