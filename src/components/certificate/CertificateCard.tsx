/**
 * Bilingual (English + Arabic) Certificate of Excellence card.
 * Pure server-renderable — no client state, no JS. Looks the same in
 * the browser, in print preview, and in the rasterised PNG export.
 *
 * Single source of truth for visual design used by:
 *   - /exam/[id]/certificate            (single-exam ≥80%)
 *   - /mock/[id]/certificate            (mock-exam ≥70%)
 *   - /exam/[id]/leaderboard/podium     (combined top-3, separate component)
 *
 * Signature + round stamp are inline SVG so they render identically
 * everywhere (no image-loading races, no CORS issues during the PNG
 * snapshot).
 */
export type CertificateProps = {
  /** Recipient's name. Renders in serif at large size. */
  recipientName: string;
  /** Exam / mock title — what they passed. */
  achievementTitle: string;
  /** Optional sub-line (specialty / difficulty / exam type). */
  achievementSubline?: string;
  /** Final score 0-100. */
  scorePct: number;
  /** Number of questions in the exam. */
  questionCount: number;
  /** Date of completion. */
  completedAt: Date;
  /** Unique cert number (CERT-EX-2026-XXXXXXXX style). */
  certNumber: string;
  /** "Certificate of Excellence" vs "Certificate of Completion". */
  variant?: "excellence" | "completion";
};

const TXT = {
  en: {
    excellence: "Certificate of Excellence",
    completion: "Certificate of Completion",
    presented: "This certificate is presented to",
    forCompleting: "For successfully completing",
    score: "Score",
    questions: "Questions",
    date: "Date",
    certNo: "Certificate No.",
    signature: "Authorised signature",
    org: "MedExam Hub",
    tagline: "AI-powered medical exam preparation",
    location: "Cairo, Egypt",
    verify: "Verify at medexamhub.org/verify",
  },
  ar: {
    excellence: "شهادة امتياز",
    completion: "شهادة إتمام",
    presented: "تُمنح هذه الشهادة إلى",
    forCompleting: "لإتمامه بنجاح",
    score: "الدرجة",
    questions: "الأسئلة",
    date: "التاريخ",
    certNo: "رقم الشهادة",
    signature: "التوقيع المعتمد",
    org: "ميدإكزام هَب",
    tagline: "إعداد الامتحانات الطبية بالذكاء الاصطناعي",
    location: "القاهرة، مصر",
    verify: "تحقق على medexamhub.org/verify",
  },
};

function fmtDate(d: Date, locale: "en-GB" | "ar-EG"): string {
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CertificateCard(props: CertificateProps) {
  const titleEn = props.variant === "completion" ? TXT.en.completion : TXT.en.excellence;
  const titleAr = props.variant === "completion" ? TXT.ar.completion : TXT.ar.excellence;
  const score = Math.round(props.scorePct);

  return (
    // The card itself — fixed aspect ratio so it screenshots cleanly
    // at the same crop on every device.
    <div
      id="cert-card"
      className="cert-card relative mx-auto aspect-[1.414/1] w-full max-w-[1100px] overflow-hidden rounded-xl border-[10px] border-double border-amber-700 bg-gradient-to-br from-amber-50 via-white to-blue-50 px-8 py-10 shadow-2xl sm:px-14 sm:py-12"
    >
      {/* Decorative inner border line */}
      <div className="absolute inset-3 rounded-md border border-amber-400/50" aria-hidden />

      {/* Subtle background watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]"
      >
        <span className="font-serif text-[12rem] font-bold text-amber-900">
          MEH
        </span>
      </div>

      {/* Corner ornaments */}
      <span aria-hidden className="absolute left-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute right-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 left-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 right-6 text-2xl text-amber-700">❦</span>

      {/* Header — organisation */}
      <div className="relative text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-800">
          {TXT.en.org} · {TXT.ar.org}
        </p>
        <p className="mt-1 text-[10px] text-amber-700/80">
          {TXT.en.tagline} · {TXT.ar.tagline}
        </p>
      </div>

      {/* Title — bilingual */}
      <div className="relative mt-7 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {titleEn}
        </h1>
        <h2
          dir="rtl"
          className="mt-1 font-serif text-2xl font-bold text-zinc-800 sm:text-3xl"
          style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', 'Times New Roman', serif" }}
        >
          {titleAr}
        </h2>
      </div>

      {/* Presented-to block */}
      <div className="relative mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          {TXT.en.presented}
        </p>
        <p
          dir="rtl"
          className="mt-0.5 text-xs text-zinc-500"
          style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
        >
          {TXT.ar.presented}
        </p>
        <p className="mt-3 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">
          {props.recipientName}
        </p>
        {/* Decorative underline */}
        <div className="mx-auto mt-2 h-px w-48 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
      </div>

      {/* Achievement block */}
      <div className="relative mt-6 text-center">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {TXT.en.forCompleting} · <span dir="rtl">{TXT.ar.forCompleting}</span>
        </p>
        <p className="mt-1.5 text-base font-semibold text-zinc-900 sm:text-lg">
          {props.achievementTitle}
        </p>
        {props.achievementSubline && (
          <p className="text-xs text-zinc-500">{props.achievementSubline}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="relative mx-auto mt-6 grid max-w-md grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {TXT.en.score}
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-emerald-700">
            {score}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {TXT.en.questions}
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-zinc-800">
            {props.questionCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {TXT.en.date}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-zinc-800">
            {fmtDate(props.completedAt, "en-GB")}
          </p>
        </div>
      </div>

      {/* Footer: signature on left, stamp on right */}
      <div className="relative mt-10 flex items-end justify-between gap-6">
        {/* Signature column */}
        <div className="flex-1 text-center">
          <SignatureSvg />
          <div className="mx-auto h-px w-40 bg-zinc-700" />
          <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
            Dr. Mohamed Magdy · {TXT.en.signature}
          </p>
          <p
            dir="rtl"
            className="text-[10px] text-zinc-600"
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            د. محمد مجدي · {TXT.ar.signature}
          </p>
        </div>

        {/* Stamp column */}
        <div className="flex-shrink-0">
          <StampSvg />
        </div>

        {/* Cert number column */}
        <div className="flex-1 text-end">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {TXT.en.certNo}
          </p>
          <p className="font-mono text-xs font-semibold">{props.certNumber}</p>
          <p className="mt-2 text-[9px] text-zinc-400">{TXT.en.verify}</p>
          <p
            dir="rtl"
            className="text-[9px] text-zinc-400"
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            {TXT.ar.verify}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline "Dr. Mohamed Magdy" signature in cursive SVG path. Hand-tuned
 * Bezier curves so it renders identically regardless of installed
 * fonts. Browsers vary wildly on cursive font availability.
 */
function SignatureSvg() {
  return (
    <svg
      viewBox="0 0 200 50"
      className="mx-auto h-12 w-40"
      aria-label="Authorised signature"
      role="img"
    >
      <path
        d="M 10 35 C 15 20, 25 15, 30 30 S 40 45, 45 25 L 50 30 C 55 15, 65 20, 70 32 L 75 25 C 80 35, 90 28, 95 22 L 105 30 Q 110 18 120 28 L 130 22 C 135 35, 145 25, 150 30 L 160 24 C 165 32, 175 28, 185 22 L 190 28"
        stroke="#1e3a8a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Underline flourish */}
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

/**
 * Round official stamp — concentric circles with star and centre text.
 * Drawn entirely in SVG so it scales without pixelation.
 */
function StampSvg() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-24 w-24 -rotate-6"
      aria-label="MedExam Hub official stamp"
      role="img"
    >
      <defs>
        <path id="stamp-curve-top" d="M 60 60 m -45 0 a 45 45 0 0 1 90 0" fill="none" />
        <path id="stamp-curve-bot" d="M 60 60 m -45 0 a 45 45 0 0 0 90 0" fill="none" />
      </defs>
      {/* Outer ring */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="#b91c1c" strokeWidth="2" />
      {/* Inner ring */}
      <circle cx="60" cy="60" r="45" fill="none" stroke="#b91c1c" strokeWidth="1.5" />
      {/* Innermost circle */}
      <circle cx="60" cy="60" r="20" fill="none" stroke="#b91c1c" strokeWidth="1" />
      {/* Star in centre */}
      <path
        d="M 60 47 L 63 56 L 73 56 L 65 62 L 68 71 L 60 65 L 52 71 L 55 62 L 47 56 L 57 56 Z"
        fill="#b91c1c"
      />
      {/* Curved text top */}
      <text fill="#b91c1c" fontSize="8" fontWeight="700" letterSpacing="1.5">
        <textPath href="#stamp-curve-top" startOffset="50%" textAnchor="middle">
          MEDEXAM HUB · OFFICIAL
        </textPath>
      </text>
      {/* Curved text bottom */}
      <text fill="#b91c1c" fontSize="7" fontWeight="600" letterSpacing="1">
        <textPath href="#stamp-curve-bot" startOffset="50%" textAnchor="middle">
          AI MEDICAL EDUCATION · CAIRO
        </textPath>
      </text>
    </svg>
  );
}
