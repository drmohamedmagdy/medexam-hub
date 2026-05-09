import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDuration } from "@/lib/courses";

export const metadata = { title: "Courses — MedExam Hub" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filterCategory = sp.category;

  type CourseWhere = NonNullable<
    Parameters<typeof prisma.course.findMany>[0]
  >["where"];
  const where: CourseWhere = { isPublished: true };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filterCategory) {
    where.category = filterCategory;
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      durationSec: true,
      thumbnailUrl: true,
      viewCount: true,
      createdAt: true,
    },
  });

  const allCategories = await prisma.course.findMany({
    where: { isPublished: true },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  const grouped = new Map<string, typeof courses>();
  for (const c of courses) {
    const list = grouped.get(c.category) ?? [];
    list.push(c);
    grouped.set(c.category, list);
  }
  const sortedCategories = Array.from(grouped.keys()).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Courses
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
            Watch recorded lectures and clinical walkthroughs.
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search courses…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
        {(q || filterCategory) && (
          <Link
            href="/courses"
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-slate-700"
          >
            Reset
          </Link>
        )}
      </form>

      {allCategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/courses"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !filterCategory
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
            }`}
          >
            All
          </Link>
          {allCategories.map((c) => (
            <Link
              key={c.category}
              href={`/courses?category=${encodeURIComponent(c.category)}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filterCategory === c.category
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
              }`}
            >
              {c.category}
            </Link>
          ))}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-4xl" aria-hidden>
            🎬
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-slate-300">
            {q || filterCategory
              ? "No courses match your search."
              : "No courses published yet — check back soon."}
          </p>
        </div>
      ) : filterCategory || q ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {sortedCategories.map((cat) => (
            <section key={cat}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{cat}</h2>
                <Link
                  href={`/courses?category=${encodeURIComponent(cat)}`}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-cyan-400"
                >
                  View all →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(grouped.get(cat) ?? []).slice(0, 6).map((c) => (
                  <CourseCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  c,
}: {
  c: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    durationSec: number | null;
    thumbnailUrl: string | null;
    viewCount: number;
    createdAt: Date;
  };
}) {
  return (
    <Link
      href={`/courses/${c.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-cyan-700/60"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900">
        {c.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.thumbnailUrl}
            alt={c.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl" aria-hidden>
            🎬
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {c.durationSec ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            {formatDuration(c.durationSec)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 font-semibold leading-snug" title={c.title}>
          {c.title}
        </h3>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-slate-500">
          {c.category}
        </div>
        {c.description && (
          <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-slate-400">
            {c.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-zinc-500 dark:text-slate-500">
          <span>
            {c.viewCount} view{c.viewCount === 1 ? "" : "s"}
          </span>
          <span className="font-medium text-blue-600 dark:text-cyan-400">
            Watch →
          </span>
        </div>
      </div>
    </Link>
  );
}
