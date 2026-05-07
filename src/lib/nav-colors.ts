// Static class strings (Tailwind purge-safe). Used by both the desktop
// header in app/layout.tsx and the mobile hamburger in components/MobileNav.tsx
// so both surfaces share one source of truth for nav colours.

export type NavColor =
  | "indigo"
  | "blue"
  | "violet"
  | "rose"
  | "emerald"
  | "amber"
  | "zinc";

// Subtle pill styling for the desktop bar.
export const NAV_COLOR_DESKTOP: Record<NavColor, string> = {
  indigo:
    "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50",
  blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50",
  violet:
    "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50",
  rose: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50",
  emerald:
    "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50",
  amber:
    "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50",
  zinc: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
};

// Slightly more saturated for the mobile sheet (taps want bigger contrast).
export const NAV_COLOR_MOBILE: Record<NavColor, string> = {
  indigo:
    "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-200",
  blue: "bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-200",
  violet:
    "bg-violet-50 text-violet-800 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-200",
  rose: "bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-200",
  emerald:
    "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200",
  amber:
    "bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200",
  zinc: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
};
