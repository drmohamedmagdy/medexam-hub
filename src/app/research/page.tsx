import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUseResearch, researchAccessHint } from "@/lib/research-access";
import { kindLabel, kindEmoji } from "@/lib/research-templates";

export const metadata = { title: "Research Assistant — MedExam Hub" };

export default async function ResearchListPage() {
  const user = await requireUser();
  const allowed = canUseResearch(user.plan);
  const hint = researchAccessHint(user.plan);

  // Always read the user's projects — Premium users grandfathered from the
  // earlier pay-per-section policy may still own projects, and we want them
  // visible (read-only) instead of vanishing.
  const projects = await prisma.researchProject.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sections: true } },
      sections: {
        select: { content: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            🧠 Research &amp; Statistics
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Build research protocols, theses, manuscripts, and systematic reviews
            with AI. Run any of 17 statistical tests. Export to Word with embedded
            charts.
          </p>
        </div>
        <Link
          href="/research/new"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New project
        </Link>
      </header>

      {!allowed && (
        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/40">
          <h2 className="text-base font-semibold text-violet-900 dark:text-violet-200">
            ✨ Researcher plan — special service
          </h2>
          <p className="mt-1 text-sm text-violet-900 dark:text-violet-300">
            Browse the interface freely. Creating a project, generating a section,
            running a statistical test, uploading data, or exporting a Word document
            requires the Researcher plan.
          </p>
          <Link
            href="/plans"
            className="mt-3 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Upgrade to Researcher →
          </Link>
        </div>
      )}

      {allowed && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-blue-900 dark:text-blue-200">
            <strong>Plan:</strong> {hint.message}
          </p>
        </div>
      )}

      <Link
        href="/statistics"
        className="mt-4 block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">📊 Statistics workspace</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Standalone tool — upload a CSV/Excel and run analyses without creating
              a project. Same 17 tests, same chart export.
            </p>
          </div>
          <span className="text-blue-600 dark:text-cyan-400">→</span>
        </div>
      </Link>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No research projects yet. Create your first protocol or thesis above.
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const completed = p.sections.filter((s) => s.content.trim().length > 0).length;
            const total = p._count.sections;
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            const kEmoji = kindEmoji(p.kind);
            const kLabel = kindLabel(p.kind);
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-700/60"
              >
                <Link href={`/research/${p.id}`} className="block">
                  <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-cyan-400">
                    {kEmoji} {kLabel}
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold">{p.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {[p.specialty, p.studyType].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {completed} / {total} sections
                      </span>
                      <span className="font-mono font-semibold">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Updated {p.updatedAt.toLocaleDateString()}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
