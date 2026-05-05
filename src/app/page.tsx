import Link from "next/link";
import Image from "next/image";
import { SPECIALTIES } from "@/lib/specialties";
import { EXAM_TYPE_GROUPS } from "@/lib/exam-types";
import { PLAN_LIMITS, PROMO_DISCOUNT_PCT } from "@/lib/plans";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import SpecialtyFilter from "@/components/SpecialtyFilter";

export default async function Home() {
  const locale = await getLocale();
  const t = getTranslations(locale);
  const tH = t.home;
  const tHE = t.homeExtra;
  const totalFormats = EXAM_TYPE_GROUPS.reduce((s, g) => s + g.exams.length, 0);
  const demoOptions = [
    { id: "A", text: tHE.demoOptionA },
    { id: "B", text: tHE.demoOptionB },
    { id: "C", text: tHE.demoOptionC },
    { id: "D", text: tHE.demoOptionD },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-slate-800/60">
        {/* Light-mode gradient base */}
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:hidden" />
        {/* Dark-mode gradient base — subtle slate tones, not heavy navy */}
        <div className="absolute inset-0 -z-20 hidden bg-slate-950 dark:block" />
        {/* Decorative glows — visible in both modes, pop more in dark */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_55%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_60%,rgba(34,211,238,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_85%_60%,rgba(99,102,241,0.18),transparent_55%)]" />

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24 lg:gap-12">
          {/* Left: Hero copy */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <div className="rounded-full p-1 transition dark:bg-white/95 dark:p-1.5 dark:shadow-[0_0_40px_rgba(56,189,248,0.25)] dark:ring-1 dark:ring-white/40">
              <Image
                src="/logo.webp"
                alt="MedExam Hub"
                width={120}
                height={120}
                className="h-20 w-20 rounded-full sm:h-24 sm:w-24"
                priority
              />
            </div>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              {tH.badge}
            </span>
            {PROMO_DISCOUNT_PCT > 0 && (
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/60 dark:text-amber-200">
                <span aria-hidden>🎉</span>
                Limited-time {PROMO_DISCOUNT_PCT}% OFF on all plans
              </span>
            )}
            <h1 className="mt-4 max-w-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-indigo-300 sm:text-5xl lg:text-6xl">
              {tH.title}
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-slate-300 sm:mt-5 sm:text-lg">
              {tH.subtitle}
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/signup"
                className="cta-pulse rounded-full bg-blue-600 px-6 py-3 text-center text-base font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-blue-600/40"
              >
                {tH.ctaStart}
              </Link>
              <Link
                href="/plans"
                className="rounded-full border border-zinc-300 bg-white/70 px-6 py-3 text-center text-base font-medium backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                {tH.ctaPlans.replace("{price}", String(PLAN_LIMITS.BASIC.priceMonthly))}
              </Link>
            </div>
            <p className="mt-5 text-xs text-zinc-500 dark:text-slate-400">{tH.trustLine}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-start">
              {tHE.trustBadges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-slate-300"
                >
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Demo MCQ card */}
          <div className="self-center lg:self-stretch">
            <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl shadow-blue-600/5 dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-cyan-500/5 dark:backdrop-blur sm:p-6">
              <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
                {tHE.demoLabel}
              </div>
              <p className="mt-3 text-sm leading-relaxed">{tHE.demoQuestion}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {demoOptions.map((o) => {
                  const isCorrect = o.id === tHE.demoCorrect;
                  return (
                    <li
                      key={o.id}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2 ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-900/30"
                          : "border-zinc-200 dark:border-slate-700/60 dark:bg-slate-800/30"
                      }`}
                    >
                      <span className="font-mono font-semibold">{o.id}.</span>
                      <span className="flex-1">{o.text}</span>
                      {isCorrect && (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          ✓
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-slate-800/50 dark:text-slate-300">
                <span className="font-semibold text-zinc-900 dark:text-slate-100">↑</span>{" "}
                {tHE.demoExplanation}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY (outcomes) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tH.whyH}</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{tH.whySub}</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tH.features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/5 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-cyan-700/60 dark:hover:shadow-cyan-500/10"
            >
              <div className="text-3xl" aria-hidden>{f.emoji}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-zinc-200 bg-zinc-50/70 dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tH.howH}</h2>
            <p className="mt-2 text-zinc-600 dark:text-slate-400">{tH.howSub}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {tH.steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white shadow-md shadow-blue-600/30 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-blue-600 dark:shadow-cyan-500/30">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tHE.testimonialsH}</h2>
          <p className="mt-2 text-zinc-600 dark:text-slate-400">{tHE.testimonialsSub}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tHE.testimonials.map((tm) => (
            <figure
              key={tm.author}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur"
            >
              <div className="text-2xl text-blue-600 dark:text-cyan-400" aria-hidden>“</div>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-zinc-700 dark:text-slate-200">
                {tm.quote}
              </blockquote>
              <figcaption className="mt-4 text-sm">
                <div className="font-semibold">{tm.author}</div>
                <div className="text-xs text-zinc-500 dark:text-slate-500">{tm.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* EXAM FORMATS */}
      <section className="border-y border-zinc-200 bg-zinc-50/70 dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tH.formatsH}</h2>
            <p className="mt-2 text-zinc-600 dark:text-slate-400">{tH.formatsSub}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tH.regions.map((r) => (
              <div
                key={r.region}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
                  {r.region}
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-slate-200">{r.takeaway}</p>
              </div>
            ))}
            <Link
              href="/exam/new"
              className="flex flex-col items-start justify-between rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-5 text-blue-800 transition hover:bg-blue-100 dark:border-cyan-700/60 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-950/50"
            >
              <p className="text-sm">
                {tH.formatsAll.replace("{count}", String(totalFormats))}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* SPECIALTIES */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tH.specialtiesH}</h2>
        <p className="mt-2 text-zinc-600 dark:text-slate-400">
          {tH.specialtiesSub.replace("{count}", String(SPECIALTIES.length))}
        </p>
        <div className="mt-6">
          <SpecialtyFilter
            items={SPECIALTIES}
            searchPlaceholder={tHE.specialtiesSearch}
            noResultsLabel={tHE.specialtiesNoResults}
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{tH.finalH}</h2>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-slate-400">{tH.finalSub}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="cta-pulse rounded-full bg-blue-600 px-7 py-3.5 text-base font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 dark:shadow-cyan-500/20"
          >
            {tH.finalCreate}
          </Link>
          <Link
            href="/plans"
            className="rounded-full border border-zinc-300 px-7 py-3.5 text-base font-medium hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800/50"
          >
            {tH.finalCompare}
          </Link>
        </div>
      </section>
    </div>
  );
}
