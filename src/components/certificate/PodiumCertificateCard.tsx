/**
 * Bilingual top-3 podium certificate. One image celebrating the
 * podium of a shared exam — the owner of the shared link captures
 * this and posts to social media to announce winners.
 */

type PodiumEntry = {
  rank: 1 | 2 | 3;
  name: string;
  scorePct: number;
};

type Props = {
  /** Title of the shared exam they competed on. */
  examTitle: string;
  /** Optional subline (specialty, exam type). */
  examSubline?: string;
  /** 1st, 2nd, 3rd entries (length 1-3). */
  podium: PodiumEntry[];
  completedAt: Date;
  /** Total attempts on the shared exam (for context). */
  totalAttempts: number;
  certNumber: string;
};

export default function PodiumCertificateCard(props: Props) {
  const ordered = [...props.podium].sort((a, b) => a.rank - b.rank);
  const heightForRank: Record<number, string> = {
    1: "h-32",
    2: "h-24",
    3: "h-20",
  };
  const colorForRank: Record<number, string> = {
    1: "from-amber-200 via-amber-100 to-amber-300 border-amber-500",
    2: "from-zinc-200 via-zinc-100 to-zinc-300 border-zinc-500",
    3: "from-orange-200 via-orange-100 to-orange-300 border-orange-600",
  };
  const medalForRank: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      id="cert-card"
      className="cert-card relative mx-auto aspect-[1.414/1] w-full max-w-[1100px] overflow-hidden rounded-xl border-[10px] border-double border-amber-700 bg-gradient-to-br from-amber-50 via-white to-blue-50 px-8 py-10 shadow-2xl sm:px-12 sm:py-10"
    >
      <div className="absolute inset-3 rounded-md border border-amber-400/50" aria-hidden />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]"
      >
        <span className="font-serif text-[12rem] font-bold text-amber-900">🏆</span>
      </div>

      <span aria-hidden className="absolute left-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute right-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 left-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 right-6 text-2xl text-amber-700">❦</span>

      {/* Header */}
      <div className="relative text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-800">
          MedExam Hub · ميدإكزام هَب
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Top 3 Achievers
        </h1>
        <h2
          dir="rtl"
          className="mt-1 font-serif text-2xl font-bold text-zinc-800 sm:text-3xl"
          style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
        >
          أفضل ثلاثة متفوقين
        </h2>
        <p className="mt-3 text-sm text-zinc-700 sm:text-base">
          on <span className="font-semibold">{props.examTitle}</span>
          {props.examSubline && (
            <span className="text-zinc-500"> · {props.examSubline}</span>
          )}
        </p>
        <p className="text-xs text-zinc-500">
          out of {props.totalAttempts} {props.totalAttempts === 1 ? "candidate" : "candidates"}
        </p>
      </div>

      {/* Podium — order columns 2/1/3 for the classic visual: silver, gold, bronze */}
      <div className="relative mx-auto mt-6 flex max-w-xl items-end justify-center gap-3 sm:gap-4">
        {[2, 1, 3].map((rank) => {
          const entry = ordered.find((p) => p.rank === rank);
          if (!entry) {
            // Empty pedestal placeholder so the visual still works with 1 or 2 entries.
            return (
              <div key={rank} className="flex w-1/3 flex-col items-center">
                <div
                  className={`flex w-full ${heightForRank[rank]} items-end justify-center rounded-t-md border-b-4 border-dashed border-zinc-300 bg-zinc-100 px-2 dark:border-zinc-700 dark:bg-zinc-800/40`}
                >
                  <span className="text-xs text-zinc-400 pb-1">—</span>
                </div>
              </div>
            );
          }
          return (
            <div key={rank} className="flex w-1/3 flex-col items-center">
              <div className="mb-2 text-3xl sm:text-4xl">{medalForRank[rank]}</div>
              <p className="text-center font-serif text-base font-bold text-zinc-900 sm:text-lg">
                {entry.name}
              </p>
              <p className="text-center font-mono text-sm font-semibold text-emerald-700">
                {Math.round(entry.scorePct)}%
              </p>
              <div
                className={`mt-2 flex w-full ${heightForRank[rank]} items-start justify-center rounded-t-md border-2 border-b-0 bg-gradient-to-b ${colorForRank[rank]} px-2 pt-2`}
              >
                <span className="font-serif text-2xl font-bold text-zinc-800">
                  {rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative mt-8 flex items-end justify-between gap-6">
        <div className="flex-1 text-center">
          <SignatureSvg />
          <div className="mx-auto h-px w-40 bg-zinc-700" />
          <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
            Dr. Mohamed Magdy · Authorised signature
          </p>
          <p
            dir="rtl"
            className="text-[10px] text-zinc-600"
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            د. محمد مجدي · التوقيع المعتمد
          </p>
        </div>

        <div className="flex-shrink-0">
          <StampSvg />
        </div>

        <div className="flex-1 text-end">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {props.completedAt.toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="font-mono text-[10px] font-semibold">{props.certNumber}</p>
          <p className="mt-2 text-[9px] text-zinc-400">medexamhub.org</p>
        </div>
      </div>
    </div>
  );
}

function SignatureSvg() {
  return (
    <svg viewBox="0 0 200 50" className="mx-auto h-12 w-40" aria-hidden role="img">
      <path
        d="M 10 35 C 15 20, 25 15, 30 30 S 40 45, 45 25 L 50 30 C 55 15, 65 20, 70 32 L 75 25 C 80 35, 90 28, 95 22 L 105 30 Q 110 18 120 28 L 130 22 C 135 35, 145 25, 150 30 L 160 24 C 165 32, 175 28, 185 22 L 190 28"
        stroke="#1e3a8a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 8 42 Q 100 50, 192 42"
        stroke="#1e3a8a"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StampSvg() {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-6" aria-hidden role="img">
      <defs>
        <path id="ptop" d="M 60 60 m -45 0 a 45 45 0 0 1 90 0" fill="none" />
        <path id="pbot" d="M 60 60 m -45 0 a 45 45 0 0 0 90 0" fill="none" />
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="#b91c1c" strokeWidth="2" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="#b91c1c" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="20" fill="none" stroke="#b91c1c" strokeWidth="1" />
      <path
        d="M 60 47 L 63 56 L 73 56 L 65 62 L 68 71 L 60 65 L 52 71 L 55 62 L 47 56 L 57 56 Z"
        fill="#b91c1c"
      />
      <text fill="#b91c1c" fontSize="8" fontWeight="700" letterSpacing="1.5">
        <textPath href="#ptop" startOffset="50%" textAnchor="middle">
          MEDEXAM HUB · OFFICIAL
        </textPath>
      </text>
      <text fill="#b91c1c" fontSize="7" fontWeight="600" letterSpacing="1">
        <textPath href="#pbot" startOffset="50%" textAnchor="middle">
          AI MEDICAL EDUCATION · CAIRO
        </textPath>
      </text>
    </svg>
  );
}
