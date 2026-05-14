"use client";

import Link from "next/link";

type Stats = {
  examsCreated: number;
  examsCompleted: number;
  mockExams: number;
  questions: number;
  reviewCardsCleared: number;
  notes: number;
  avgScore: number | null;
  topSpecialty: { name: string; avgScore: number } | null;
  topSpecialtyByVolume: string | null;
  peakMonth: string | null;
  specialtiesCovered: number;
};

export default function ShareCard({
  year,
  recipientName,
  stats,
}: {
  year: number;
  recipientName: string;
  stats: Stats;
}) {
  const hasAnyActivity = stats.examsCreated > 0 || stats.reviewCardsCleared > 0;

  const shareText = hasAnyActivity
    ? `My ${year} on MedExam Hub: ${stats.questions.toLocaleString()} questions, ${stats.examsCompleted} exams completed${stats.topSpecialty ? `, strongest in ${stats.topSpecialty.name} (${stats.topSpecialty.avgScore}%)` : ""}. 🎓`
    : `My ${year} medical exam prep journey started on MedExam Hub.`;
  const shareUrl = "https://medexamhub.org";

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: `My ${year} on MedExam Hub`, text: shareText, url: shareUrl });
      } catch {}
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Year in review
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {recipientName}&apos;s {year} on MedExam Hub
        </h1>
      </div>

      {/* Hero card — what goes in the screenshot for social */}
      <div className="mt-8 overflow-hidden rounded-3xl border-2 border-blue-500 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
          MedExam Hub · {year} Wrapped
        </p>
        <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
          {recipientName.split(" ")[0]}
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Questions answered" value={stats.questions.toLocaleString()} />
          <Stat label="Exams completed" value={stats.examsCompleted.toLocaleString()} />
          <Stat label="Mock exams" value={stats.mockExams.toLocaleString()} />
          <Stat
            label="Avg score"
            value={stats.avgScore !== null ? `${stats.avgScore}%` : "—"}
          />
        </div>

        {stats.topSpecialty && (
          <div className="mt-8 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Strongest specialty
            </p>
            <p className="mt-1 font-serif text-2xl font-bold">
              {stats.topSpecialty.name}
            </p>
            <p className="text-sm text-blue-100">
              {stats.topSpecialty.avgScore}% average score
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {stats.topSpecialtyByVolume && (
            <Fact icon="🔥" text={`Most-practiced: ${stats.topSpecialtyByVolume}`} />
          )}
          {stats.peakMonth && (
            <Fact icon="📅" text={`Peak study month: ${stats.peakMonth}`} />
          )}
          {stats.reviewCardsCleared > 0 && (
            <Fact
              icon="🃏"
              text={`${stats.reviewCardsCleared.toLocaleString()} review cards cleared`}
            />
          )}
          {stats.notes > 0 && (
            <Fact icon="📝" text={`${stats.notes.toLocaleString()} study notes generated`} />
          )}
          <Fact
            icon="🧪"
            text={`${stats.specialtiesCovered} ${stats.specialtiesCovered === 1 ? "specialty" : "specialties"} covered`}
          />
        </div>

        <p className="mt-8 text-center text-xs text-blue-100">
          medexamhub.org · AI-powered medical exam prep
        </p>
      </div>

      {/* Share row */}
      {hasAnyActivity && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Share your year:
          </span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-blue-950/40"
          >
            📘 Facebook
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-blue-950/40"
          >
            💼 LinkedIn
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-emerald-950/40"
          >
            💬 WhatsApp
          </a>
          {typeof window !== "undefined" && "share" in window.navigator && (
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              📤 More
            </button>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ready for next year?
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link
            href="/exam/new"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Generate a new exam →
          </Link>
          <Link
            href="/plans"
            className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-blue-100">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold leading-none">{value}</p>
    </div>
  );
}

function Fact({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
      <span aria-hidden className="text-base">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
