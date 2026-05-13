import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Personal "Spotify Wrapped"-style report. Shareable on socials. Anyone
// with the URL pattern (signed in as the owner) can see their stats.
// Year is part of the URL so users can revisit previous years.

export const metadata = {
  title: "Year in Review — MedExam Hub",
};

const SHARE_URL = "https://medexamhub.org/year-in-review";

export default async function YearInReviewPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const user = await requireUser();
  const { year: yearParam } = await params;
  const now = new Date();
  const year = /^\d{4}$/.test(yearParam) ? Number.parseInt(yearParam, 10) : now.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  // Fan out aggregates in parallel — every query scoped to this user
  // + the target year.
  const [
    examCount,
    completedExams,
    questionsAgg,
    correctAgg,
    specialtyBreakdown,
    qotdAgg,
    mockExamCount,
    noteCount,
    fileUploadCount,
    reviewCardCount,
  ] = await Promise.all([
    prisma.exam.count({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
    }),
    prisma.exam.count({
      where: { userId: user.id, status: "COMPLETED", createdAt: { gte: start, lt: end } },
    }),
    prisma.question.count({
      where: {
        exam: { userId: user.id, createdAt: { gte: start, lt: end } },
        format: { not: "SHORT_NOTES" },
      },
    }),
    prisma.question.count({
      where: {
        exam: { userId: user.id, createdAt: { gte: start, lt: end } },
        format: { not: "SHORT_NOTES" },
        isCorrect: true,
      },
    }),
    prisma.exam.groupBy({
      by: ["specialty"],
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.dailyQuestionAttempt.aggregate({
      where: { userId: user.id, answeredAt: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    prisma.mockExam.count({
      where: { userId: user.id, status: "completed", createdAt: { gte: start, lt: end } },
    }),
    prisma.studyNote.count({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
    }),
    prisma.fileUpload.count({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
    }),
    prisma.reviewCard.count({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
    }),
  ]);

  const accuracy = questionsAgg > 0 ? Math.round((correctAgg / questionsAgg) * 100) : null;
  const qotdAnswered = qotdAgg._count._all;

  // Tone of the recap depends on activity level. Empty year gets a
  // gentle "let's start now" rather than 12 zeros and a sad face.
  const isEmpty = examCount === 0 && qotdAnswered === 0 && noteCount === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Year in review
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Your {year} on MedExam Hub
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {user.name?.split(" ")[0] ?? user.email.split("@")[0]} •{" "}
          {start.toLocaleDateString("en-GB", { month: "long" })} {year} —{" "}
          {new Date(end.getTime() - 86_400_000).toLocaleDateString("en-GB", { month: "long" })} {year}
        </p>
      </div>

      {isEmpty ? (
        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-4xl">🌱</p>
          <h2 className="mt-3 text-xl font-semibold">Your {year} is still a blank canvas</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Generate your first exam in 30 seconds — it&apos;s free and we&apos;ll
            tailor it to your specialty.
          </p>
          <Link
            href="/exam/new"
            className="mt-5 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Start your first exam →
          </Link>
        </section>
      ) : (
        <>
          {/* Top stats — big, splashy, Spotify-Wrapped energy. */}
          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            <BigStat
              label="Questions answered"
              value={questionsAgg.toLocaleString()}
              hint={accuracy !== null ? `${accuracy}% correct` : "Across all your exams"}
              color="blue"
            />
            <BigStat
              label="Exams completed"
              value={completedExams.toLocaleString()}
              hint={`${examCount} generated total`}
              color="emerald"
            />
            <BigStat
              label="Mock exams finished"
              value={mockExamCount.toLocaleString()}
              hint="Full-length, timed runs"
              color="amber"
            />
            <BigStat
              label="QOTD streak attempts"
              value={qotdAnswered.toLocaleString()}
              hint="Days you showed up"
              color="violet"
            />
          </section>

          {/* Top specialties */}
          {specialtyBreakdown.length > 0 && (
            <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Top specialties you practiced
              </h2>
              <ul className="mt-4 space-y-2">
                {specialtyBreakdown.map((s, i) => {
                  const max = specialtyBreakdown[0]?._count._all ?? 1;
                  const pct = Math.round((s._count._all / max) * 100);
                  return (
                    <li key={s.specialty ?? `_${i}`} className="flex items-center gap-3 text-sm">
                      <span className="w-8 font-mono text-zinc-400">#{i + 1}</span>
                      <span className="w-40 truncate font-medium">{s.specialty || "Mixed"}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-end font-mono text-xs text-zinc-500">
                        {s._count._all}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Secondary stats — smaller block of additional numbers */}
          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <SmallStat label="Study notes generated" value={noteCount} />
            <SmallStat label="Files uploaded" value={fileUploadCount} />
            <SmallStat label="Spaced-rep cards" value={reviewCardCount} />
          </section>

          {/* Shareable */}
          <section className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-3xl">🎓</p>
            <h2 className="mt-3 text-lg font-semibold text-blue-900 dark:text-blue-200">
              Share your {year} on LinkedIn
            </h2>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Doctors, medical students and residents reading your post might
              find a useful exam-prep tool too.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SHARE_URL}/${year}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-[#0a66c2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#084482]"
              >
                Share on LinkedIn
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My ${year} on MedExam Hub: ${questionsAgg} questions, ${completedExams} exams${accuracy !== null ? `, ${accuracy}% correct` : ""}. Generate your own:`)}&url=${encodeURIComponent(SHARE_URL)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Share on X / Twitter
              </a>
            </div>
          </section>
        </>
      )}

      <p className="mt-10 text-center text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-blue-600">
          Back to dashboard
        </Link>{" "}
        •{" "}
        <Link href={`/year-in-review/${year - 1}`} className="hover:text-blue-600">
          See {year - 1}
        </Link>
      </p>
    </div>
  );
}

function BigStat({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color: "blue" | "emerald" | "amber" | "violet";
}) {
  const ring = {
    blue: "from-blue-500 to-blue-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-700",
    violet: "from-violet-500 to-violet-700",
  }[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${ring} p-6 text-white shadow-lg`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
        {value}
      </p>
      <p className="mt-1 text-xs opacity-90">{hint}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
