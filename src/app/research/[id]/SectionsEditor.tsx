"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateSectionAction,
  saveSectionAction,
  type GenerateSectionState,
} from "@/app/actions/research";
import { renderPrismaSvg, safeParsePrismaFlow } from "@/lib/prisma-flow";

// Mirror of UPGRADE_REQUIRED_PREFIX in research-access.ts. Hardcoded here
// so this client component doesn't pull research-access's server-only
// transitive imports (db, credits) into the browser bundle.
const UPGRADE_REQUIRED_PREFIX = "[UPGRADE_REQUIRED] ";

type SectionData = {
  id: string;
  title: string;
  content: string;
  metadataJson: string | null;
  orderIndex: number;
  generatedAt: string | null;
};

export default function SectionsEditor({
  projectId,
  sections: initialSections,
}: {
  projectId: string;
  sections: SectionData[];
}) {
  const [sections, setSections] = useState<SectionData[]>(initialSections);

  return (
    <ol className="mt-6 space-y-4">
      {sections.map((s, i) => (
        <li key={s.id}>
          <SectionCard
            projectId={projectId}
            section={s}
            index={i}
            onContentChange={(content) =>
              setSections((prev) =>
                prev.map((p) => (p.id === s.id ? { ...p, content } : p))
              )
            }
          />
        </li>
      ))}
    </ol>
  );
}

function SectionCard({
  projectId,
  section,
  index,
  onContentChange,
}: {
  projectId: string;
  section: SectionData;
  index: number;
  onContentChange: (content: string) => void;
}) {
  const router = useRouter();
  const prismaData = section.metadataJson ? safeParsePrismaFlow(section.metadataJson) : null;
  const isPrisma = prismaData !== null;

  const [open, setOpen] = useState(
    section.content.trim().length === 0 && !isPrisma
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState(section.content);
  const [savePending, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const isEmpty = content.trim().length === 0 && !isPrisma;

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("sectionId", section.id);
      const result: GenerateSectionState = await generateSectionAction(null, fd);
      if (result?.ok) {
        setContent(result.content);
        onContentChange(result.content);
        setOpen(true);
        router.refresh();
      } else {
        setError(result?.error ?? "Generation failed.");
      }
    } finally {
      setGenerating(false);
    }
  }

  function save() {
    startSave(async () => {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("sectionId", section.id);
      fd.set("content", content);
      await saveSectionAction(fd);
      onContentChange(content);
      setSavedAt(new Date());
    });
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 text-left"
        >
          <span className="font-mono text-xs text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-semibold">{section.title}</span>
          {isEmpty ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              empty
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              ✓ written
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? "Generating…" : isEmpty ? "Generate" : "Regenerate"}
          </button>
        </div>
      </header>

      {(open || isPrisma) && (
        <div className="px-5 py-4">
          {error && error.startsWith(UPGRADE_REQUIRED_PREFIX) ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              <span>
                {error.slice(UPGRADE_REQUIRED_PREFIX.length)}
              </span>
              <Link
                href="/plans"
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                Upgrade to Researcher →
              </Link>
            </div>
          ) : error ? (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}
          {isPrisma && prismaData ? (
            <div
              className="overflow-x-auto rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800/40"
              dangerouslySetInnerHTML={{ __html: renderPrismaSvg(prismaData) }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={save}
              rows={Math.max(8, Math.min(30, content.split("\n").length + 2))}
              placeholder={`Click "Generate" above to draft this section, or write it yourself.`}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-serif text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800/50"
            />
          )}
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {isPrisma
                ? "Diagram regenerates from numbers — click Regenerate to get a new flow."
                : savePending
                  ? "Saving…"
                  : savedAt
                    ? `Saved ${savedAt.toLocaleTimeString()}`
                    : section.generatedAt
                      ? `Last generated ${new Date(section.generatedAt).toLocaleString()}`
                      : "Edits auto-save when you click outside the box."}
            </span>
            {!isPrisma && <span>{content.length.toLocaleString()} chars</span>}
          </div>
        </div>
      )}
    </article>
  );
}
