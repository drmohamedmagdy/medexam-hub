"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { NAV_COLOR_MOBILE, type NavColor } from "@/lib/nav-colors";

type Item = {
  href: string;
  label: string;
  emphasis?: "primary" | "admin" | "muted";
  color?: NavColor;
  /** Group label — items sharing a section render under a single header. */
  section?: string;
  /** Pin to the sticky bottom block (e.g. Sign In / Register). */
  pinned?: boolean;
};

export default function MobileNav({
  items,
  signedIn,
  signoutLabel,
}: {
  items: Item[];
  signedIn: boolean;
  signoutLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Split into pinned (sticky bottom block) and the scrolling body. The
  // body is grouped by `section` while preserving the order each section
  // first appeared.
  const pinned = items.filter((i) => i.pinned);
  const body = items.filter((i) => !i.pinned);
  const sectionOrder: string[] = [];
  const grouped = new Map<string, Item[]>();
  for (const it of body) {
    const key = it.section ?? "";
    if (!grouped.has(key)) {
      grouped.set(key, []);
      sectionOrder.push(key);
    }
    grouped.get(key)!.push(it);
  }

  function classFor(it: Item): string {
    if (it.emphasis === "primary") {
      return "bg-blue-600 text-white hover:bg-blue-700 shadow-sm";
    }
    if (it.emphasis === "admin") return NAV_COLOR_MOBILE.amber;
    if (it.color) return NAV_COLOR_MOBILE[it.color];
    return "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col border-b border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {sectionOrder.map((sec) => {
                const group = grouped.get(sec)!;
                return (
                  <div key={sec || "default"} className="flex flex-col gap-1.5">
                    {sec && (
                      <h3 className="mt-3 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        {sec}
                      </h3>
                    )}
                    {group.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => setOpen(false)}
                        className={`rounded-lg px-4 py-3 text-base font-medium transition ${classFor(it)}`}
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                );
              })}
              {signedIn && (
                <form
                  action={logoutAction}
                  className="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-800"
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg px-4 py-3 text-start text-base font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {signoutLabel}
                  </button>
                </form>
              )}
            </nav>
            {pinned.length > 0 && (
              <div className="border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/95">
                <div className="flex flex-col gap-2">
                  {pinned.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-lg px-4 py-3 text-center text-base font-semibold transition ${classFor(it)}`}
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
