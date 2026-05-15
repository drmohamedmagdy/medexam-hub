import type { CertLanguage } from "./detectLanguage";

/**
 * Certificate of Excellence card. Renders in a single language —
 * English for English exams, Arabic for Arabic exams — chosen by the
 * caller based on detected exam language (see ./detectLanguage.ts).
 *
 * Pure server-renderable, no JS. Looks the same in the browser, in
 * print preview, and in the html-to-image PNG export.
 *
 * Visual elements:
 *   - MedExam Hub logo (top-left, inline /logo.png)
 *   - Decorative double-border + corner ornaments + subtle watermark
 *   - Inline SVG cursive signature (no font dependency)
 *   - Inline SVG round red official stamp
 */
export type CertificateProps = {
  language: CertLanguage;
  recipientName: string;
  achievementTitle: string;
  achievementSubline?: string;
  scorePct: number;
  questionCount: number;
  completedAt: Date;
  certNumber: string;
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
    signatureName: "Dr. Mohamed Magdy",
    org: "MedExam Hub",
    tagline: "AI-powered medical exam preparation",
    verify: "Verify at medexamhub.org/verify",
    locale: "en-GB" as const,
  },
  ar: {
    excellence: "شهادة امتياز",
    completion: "شهادة إتمام",
    presented: "تُمنح هذه الشهادة إلى",
    forCompleting: "لإتمامه بنجاح",
    score: "الدرجة",
    questions: "عدد الأسئلة",
    date: "التاريخ",
    certNo: "رقم الشهادة",
    signature: "التوقيع المعتمد",
    signatureName: "د. محمد مجدي",
    org: "ميدإكزام هَب",
    tagline: "إعداد الامتحانات الطبية بالذكاء الاصطناعي",
    verify: "تحقق على medexamhub.org/verify",
    locale: "ar-EG" as const,
  },
};

export default function CertificateCard(props: CertificateProps) {
  const t = TXT[props.language];
  const isAr = props.language === "ar";
  const title = props.variant === "completion" ? t.completion : t.excellence;
  const score = Math.round(props.scorePct);
  const dir = isAr ? "rtl" : "ltr";
  const arFont = isAr
    ? "'Amiri', 'Noto Naskh Arabic', 'Cairo', 'Tahoma', serif"
    : undefined;

  return (
    <div
      id="cert-card"
      dir={dir}
      className="cert-card relative mx-auto aspect-[1.414/1] w-full max-w-[1100px] overflow-hidden rounded-xl border-[10px] border-double border-amber-700 bg-gradient-to-br from-amber-50 via-white to-blue-50 px-8 py-10 shadow-2xl sm:px-14 sm:py-12"
      style={isAr ? { fontFamily: arFont } : undefined}
    >
      <div className="absolute inset-3 rounded-md border border-amber-400/50" aria-hidden />

      {/* Subtle background watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]"
      >
        <span className="text-[12rem] font-bold text-amber-900" style={{ fontFamily: "serif" }}>
          MEH
        </span>
      </div>

      {/* Corner ornaments */}
      <span aria-hidden className="absolute left-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute right-6 top-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 left-6 text-2xl text-amber-700">❦</span>
      <span aria-hidden className="absolute bottom-6 right-6 text-2xl text-amber-700">❦</span>

      {/* Top-left logo */}
      <div className="absolute left-10 top-10 flex items-center gap-2">
        {/* Same-origin image — no crossOrigin attribute (that would
            force a CORS request the same-origin server doesn't satisfy
            and would taint the canvas → break html-to-image). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-md object-contain"
        />
      </div>

      {/* Header — organisation */}
      <div className="relative pt-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-800">
          {t.org}
        </p>
        <p className="mt-1 text-[10px] text-amber-700/80">{t.tagline}</p>
      </div>

      {/* Title */}
      <div className="relative mt-7 text-center">
        <h1
          className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
          style={arFont ? { fontFamily: arFont } : undefined}
        >
          {title}
        </h1>
      </div>

      {/* Presented-to block */}
      <div className="relative mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          {t.presented}
        </p>
        <p className="mt-3 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">
          {props.recipientName}
        </p>
        <div className="mx-auto mt-2 h-px w-48 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
      </div>

      {/* Achievement block */}
      <div className="relative mt-6 text-center">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t.forCompleting}
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
            {t.score}
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-emerald-700">
            {score}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {t.questions}
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-zinc-800">
            {props.questionCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {t.date}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-zinc-800">
            {props.completedAt.toLocaleDateString(t.locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Footer: signature, stamp, cert number */}
      <div className="relative mt-10 flex items-end justify-between gap-6">
        <div className="flex-1 text-center">
          <SignatureSvg />
          <div className="mx-auto h-px w-40 bg-zinc-700" />
          <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
            {t.signatureName} · {t.signature}
          </p>
        </div>

        <div className="flex-shrink-0">
          <StampSvg />
        </div>

        <div className="flex-1 text-end">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {t.certNo}
          </p>
          <p className="font-mono text-xs font-semibold">{props.certNumber}</p>
          <p className="mt-2 text-[9px] text-zinc-400">{t.verify}</p>
        </div>
      </div>
    </div>
  );
}

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
      <circle cx="60" cy="60" r="55" fill="none" stroke="#b91c1c" strokeWidth="2" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="#b91c1c" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="20" fill="none" stroke="#b91c1c" strokeWidth="1" />
      <path
        d="M 60 47 L 63 56 L 73 56 L 65 62 L 68 71 L 60 65 L 52 71 L 55 62 L 47 56 L 57 56 Z"
        fill="#b91c1c"
      />
      <text fill="#b91c1c" fontSize="8" fontWeight="700" letterSpacing="1.5">
        <textPath href="#stamp-curve-top" startOffset="50%" textAnchor="middle">
          MEDEXAM HUB · OFFICIAL
        </textPath>
      </text>
      <text fill="#b91c1c" fontSize="7" fontWeight="600" letterSpacing="1">
        <textPath href="#stamp-curve-bot" startOffset="50%" textAnchor="middle">
          AI MEDICAL EDUCATION · CAIRO
        </textPath>
      </text>
    </svg>
  );
}
