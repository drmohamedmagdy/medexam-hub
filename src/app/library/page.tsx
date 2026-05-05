import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canPreviewInline,
  fileKind,
  fileKindEmoji,
  fileKindLabel,
  formatBytes,
} from "@/lib/library";

export const metadata = { title: "Library — MedExam Hub" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filterCategory = sp.category;

  type ResourceWhere = NonNullable<Parameters<typeof prisma.libraryResource.findMany>[0]>["where"];
  const where: ResourceWhere = { isPublished: true };
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

  const resources = await prisma.libraryResource.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      downloadCount: true,
      createdAt: true,
    },
  });

  // Get distinct categories for the filter chips (regardless of current filter)
  const allCategories = await prisma.libraryResource.findMany({
    where: { isPublished: true },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  // Group resources by category for the default ungrouped view
  const grouped = new Map<string, typeof resources>();
  for (const r of resources) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }
  const sortedCategories = Array.from(grouped.keys()).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">📚 Library</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
            Curated study resources — PDFs, slides, notes. Free for all members.
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, category, description…"
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
            href="/library"
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-slate-700"
          >
            Reset
          </Link>
        )}
      </form>

      {/* Category chips */}
      {allCategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/library"
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
              href={`/library?category=${encodeURIComponent(c.category)}`}
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

      {/* Empty state */}
      {resources.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-4xl" aria-hidden>📚</div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-slate-300">
            {q || filterCategory
              ? "No resources match your search. Try a different keyword."
              : "The library is empty for now. Check back soon — new resources are added regularly."}
          </p>
        </div>
      ) : filterCategory || q ? (
        // Search/filter view: flat grid
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        // Default view: grouped by category
        <div className="mt-6 space-y-10">
          {sortedCategories.map((cat) => (
            <section key={cat}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{cat}</h2>
                <Link
                  href={`/library?category=${encodeURIComponent(cat)}`}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-cyan-400"
                >
                  View all →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(grouped.get(cat) ?? []).slice(0, 6).map((r) => (
                  <ResourceCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({
  r,
}: {
  r: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    downloadCount: number;
    createdAt: Date;
  };
}) {
  const kind = fileKind(r.mimeType);
  const previewable = canPreviewInline(kind);
  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur dark:hover:border-cyan-700/60">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          {fileKindEmoji(kind)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-snug" title={r.title}>
            {r.title}
          </h3>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-slate-500">
            <span>{fileKindLabel(kind)}</span>
            <span aria-hidden>·</span>
            <span>{formatBytes(r.sizeBytes)}</span>
          </div>
        </div>
      </div>
      {r.description && (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-slate-400">
          {r.description}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <span className="text-xs text-zinc-500 dark:text-slate-500">
          {r.downloadCount} download{r.downloadCount === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          {previewable && (
            <a
              href={`/api/library/${r.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Read
            </a>
          )}
          <a
            href={`/api/library/${r.id}/download`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </a>
        </div>
      </div>
    </article>
  );
}
