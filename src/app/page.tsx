import Link from "next/link";
import Image from "next/image";
import { SPECIALTIES } from "@/lib/specialties";
import { EXAM_TYPE_GROUPS } from "@/lib/exam-types";
import { PLAN_LIMITS, PROMO_DISCOUNT_PCT } from "@/lib/plans";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/auth";
import SpecialtyFilter from "@/components/SpecialtyFilter";
import StickyMobileCta from "@/components/StickyMobileCta";
import HeroDemoButton from "@/components/HeroDemoButton";
import FeatureVideo from "@/components/FeatureVideo";

export default async function Home() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const t = getTranslations(locale);
  const isGuest = !user;
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
    <div className="pb-20 sm:pb-0">
      {/* PROMO STRIP — full-width, eye-catching, only when discount is on */}
      {PROMO_DISCOUNT_PCT > 0 && (
        <Link
          href="/plans"
          className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-amber-950 transition hover:from-amber-300 hover:via-orange-300 hover:to-amber-300"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold sm:text-sm">
            <span aria-hidden>🎉</span>
            <span>
              Limited-time {PROMO_DISCOUNT_PCT}% OFF on all plans —{" "}
              <span className="underline underline-offset-2">claim it →</span>
            </span>
          </div>
        </Link>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-slate-800/60">
        {/* Light-mode gradient base */}
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:hidden" />
        {/* Dark-mode gradient base — subtle slate tones, not heavy navy */}
        <div className="absolute inset-0 -z-20 hidden bg-slate-950 dark:block" />
        {/* Decorative glows — visible in both modes, pop more in dark */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.20),transparent_55%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_60%,rgba(34,211,238,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_85%_60%,rgba(99,102,241,0.20),transparent_55%)]" />
        {/* Soft grid pattern overlay — adds texture without being noisy */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.04] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.4) 1px, transparent 1px), linear-gradient(to right, rgba(15,23,42,0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24 lg:gap-12">
          {/* Left: Hero copy */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <div className="rounded-full p-1 transition dark:bg-white/95 dark:p-1.5 dark:shadow-[0_0_40px_rgba(56,189,248,0.30)] dark:ring-1 dark:ring-white/40">
              <Image
                src="/logo.webp"
                alt="MedExam Hub"
                width={192}
                height={192}
                className="h-32 w-32 rounded-full sm:h-40 sm:w-40 lg:h-48 lg:w-48"
                priority
              />
            </div>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              {tH.badge}
            </span>
            <h1 className="mt-4 max-w-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-indigo-300 sm:text-5xl lg:text-6xl">
              {tH.title}
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-slate-300 sm:mt-5 sm:text-lg">
              {tH.subtitle}
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/signup"
                className="cta-pulse group inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-blue-600/40"
              >
                {tH.ctaStart}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <HeroDemoButton label="Watch demo (60s)" />
              <Link
                href="/plans"
                className="rounded-full border border-zinc-300 bg-white/70 px-6 py-3.5 text-center text-base font-medium backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                {tH.ctaPlans.replace("{price}", String(PLAN_LIMITS.BASIC.priceMonthly))}
              </Link>
            </div>
            <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-slate-400 lg:justify-start">
              <span className="inline-flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> 2 free exams
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> No credit card
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> Cancel anytime
              </span>
            </p>
            <p className="mt-5 text-xs text-zinc-500 dark:text-slate-400">{tH.trustLine}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-start">
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

      {/* STATS STRIP — quick visual proof of breadth */}
      <section className="border-b border-zinc-200 bg-white dark:border-slate-800/60 dark:bg-slate-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4 sm:gap-6 sm:px-6 sm:py-8">
          <Stat value={String(totalFormats)} label="Exam formats" />
          <Stat value="10" label="Languages" />
          <Stat value={`${SPECIALTIES.length}+`} label="Specialties" />
          <Stat value="2" label="Free exams to start" />
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
              className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/10 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-cyan-700/60 dark:hover:shadow-cyan-500/15"
            >
              <div className="text-3xl transition-transform group-hover:scale-110" aria-hidden>{f.emoji}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEE IT IN ACTION — autoplay, muted, looping inline videos */}
      <section className="relative overflow-hidden border-y border-zinc-200 bg-gradient-to-b from-white via-blue-50/40 to-white dark:border-slate-800/60 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Live preview
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              See MedExam Hub in action
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-slate-400">
              Quick looks at the four tools you&apos;ll spend most of your time in.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                emoji: "🎯",
                title: "AI exam generator",
                body: "Pick specialty, format, and difficulty — get a real exam in seconds.",
                src: "/demo/exams.mp4",
                poster: "/demo/exams-poster.jpg",
                href: isGuest ? "/signup" : "/exam/new",
                cta: isGuest ? "Sign up to try →" : "Try it →",
              },
              {
                emoji: "🧠",
                title: "Research Assistant",
                body: "Drafts protocols, theses, manuscripts, and systematic reviews.",
                src: "/demo/research.mp4",
                poster: "/demo/research-poster.jpg",
                href: isGuest ? "/signup" : "/research",
                cta: isGuest ? "Sign up to open →" : "Open Research →",
              },
              {
                emoji: "📊",
                title: "Statistics workspace",
                body: "Upload data, run any of 17 tests, export Word with embedded charts.",
                src: "/demo/statistics.mp4",
                poster: "/demo/statistics-poster.jpg",
                href: isGuest ? "/signup" : "/statistics",
                cta: isGuest ? "Sign up to open →" : "Open Stats →",
              },
              {
                emoji: "📚",
                title: "Free medical library",
                body: "Curated PDFs, summaries, and reference notes.",
                src: "/demo/library.mp4",
                poster: "/demo/library-poster.jpg",
                href: isGuest ? "/signup" : "/library",
                cta: isGuest ? "Sign up to browse →" : "Browse library →",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/10 dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-cyan-700/60 dark:hover:shadow-cyan-500/15 sm:p-4"
              >
                <FeatureVideo
                  src={f.src}
                  poster={f.poster}
                  emoji={f.emoji}
                  title={f.title}
                />
                <div className="mt-3 flex-1 px-1">
                  <h3 className="text-sm font-semibold sm:text-base">
                    <span aria-hidden className="mr-1.5">{f.emoji}</span>
                    {f.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 sm:text-sm">
                    {f.body}
                  </p>
                </div>
                <Link
                  href={f.href}
                  className="mt-3 inline-flex items-center justify-center rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-cyan-300 dark:hover:bg-blue-950/70 sm:text-sm"
                >
                  {f.cta}
                </Link>
              </div>
            ))}
          </div>
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
              href={isGuest ? "/signup" : "/exam/new"}
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

      {/* FINAL CTA — full-width gradient card for max attention */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-600 px-6 py-12 text-center text-white shadow-2xl shadow-blue-600/20 dark:border-cyan-800/60 dark:from-blue-700 dark:via-blue-700 dark:to-cyan-700 dark:shadow-cyan-500/20 sm:px-10 sm:py-16">
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.4), transparent 50%), radial-gradient(circle at 80% 100%, rgba(255,255,255,0.25), transparent 50%)",
            }}
            aria-hidden
          />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{tH.finalH}</h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-50">{tH.finalSub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              {tH.finalCreate}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/plans"
              className="rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-base font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              {tH.finalCompare}
            </Link>
          </div>
          <p className="mt-5 text-xs text-blue-100">
            ✓ 2 free exams · ✓ No credit card · ✓ Cancel anytime
          </p>
        </div>
      </section>

      <StickyMobileCta ctaLabel={tH.finalCreate} plansLabel={tH.finalCompare} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-cyan-300 dark:to-sky-300 sm:text-3xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-slate-400 sm:text-sm">
        {label}
      </div>
    </div>
  );
}
