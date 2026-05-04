"use client";

import { useMemo, useState } from "react";

export default function SpecialtyFilter({
  items,
  searchPlaceholder,
  noResultsLabel,
}: {
  items: readonly string[];
  searchPlaceholder: string;
  noResultsLabel: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((s) => s.toLowerCase().includes(needle));
  }, [q, items]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/60"
        aria-label={searchPlaceholder}
      />
      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">{noResultsLabel}</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {filtered.map((s) => (
            <span
              key={s}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
