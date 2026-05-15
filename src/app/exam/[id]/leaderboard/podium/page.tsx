import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PodiumCertificateCard from "@/components/certificate/PodiumCertificateCard";
import ShareCertificate from "@/components/certificate/ShareCertificate";
import { detectCertLanguage } from "@/components/certificate/detectLanguage";

// Top-3 podium certificate for a shared exam. Owner-only — only the
// creator of the master exam can view + share this image. The certificate
// celebrates the top 3 takers as one combined visual, suitable for
// posting to social media announcing the winners.

export const metadata = { title: "Top 3 podium — MedExam Hub" };

export default async function PodiumCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);

  const master = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      specialty: true,
      examType: true,
      difficulty: true,
      createdAt: true,
    },
  });
  if (!master || master.userId !== user.id) redirect("/dashboard");

  const attempts = await prisma.exam.findMany({
    where: { sharedFromId: master.id, status: "COMPLETED" },
    select: {
      id: true,
      scorePct: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ scorePct: "desc" }, { submittedAt: "asc" }],
    take: 3,
  });
  if (attempts.length === 0) return notFound();

  const totalCount = await prisma.exam.count({
    where: { sharedFromId: master.id, status: "COMPLETED" },
  });

  const podium = attempts.map((a, i) => ({
    rank: (i + 1) as 1 | 2 | 3,
    name: a.user.name?.trim() || a.user.email.split("@")[0],
    scorePct: a.scorePct ?? 0,
  }));

  const completedAt = attempts[0]?.submittedAt ?? master.createdAt;
  const certNumber = `PODIUM-${completedAt.getFullYear()}-${master.id.slice(0, 8).toUpperCase()}`;
  const subline = [master.specialty, master.examType, master.difficulty]
    .filter(Boolean)
    .join(" · ");

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
            href={`/exam/${master.id}/leaderboard`}
            className="text-sm text-zinc-500 hover:text-blue-600"
          >
            ← Back to leaderboard
          </Link>
        </div>

        <PodiumCertificateCard
          language={detectCertLanguage(master.title, master.specialty)}
          examTitle={master.title}
          examSubline={subline || undefined}
          podium={podium}
          completedAt={completedAt}
          totalAttempts={totalCount}
          certNumber={certNumber}
        />

        <ShareCertificate
          targetId="cert-card"
          fileName={`MedExamHub-Top3-${certNumber}`}
          shareText={`🏆 Top 3 on my "${master.title}" exam on MedExam Hub — out of ${totalCount} candidates.`}
        />

        <p className="no-print mx-auto mt-4 max-w-xl text-center text-xs text-zinc-500">
          This is a single combined image of your top 3 podium. Share it
          to your story / feed to celebrate the winners. Each individual
          top scorer can also download their own personal certificate
          from their results page.
        </p>
      </div>
    </>
  );
}
