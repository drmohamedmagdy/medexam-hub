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
          <div className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
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
            <nav className="flex flex-col gap-2 p-3">
              {items.map((it) => {
                let cls: string;
                if (it.emphasis === "primary") {
                  cls = "bg-blue-600 text-white hover:bg-blue-700 shadow-sm";
                } else if (it.emphasis === "admin") {
                  cls = NAV_COLOR_MOBILE.amber;
                } else if (it.color) {
                  cls = NAV_COLOR_MOBILE[it.color];
                } else {
                  cls =
                    "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";
                }
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-4 py-3 text-base font-medium transition ${cls}`}
                  >
                    {it.label}
                  </Link>
                );
              })}
              {signedIn && (
                <form action={logoutAction} className="mt-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-4 py-3 text-start text-base font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {signoutLabel}
                  </button>
                </form>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
