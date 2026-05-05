import Link from "next/link";

/**
 * Bell icon with unread count badge for the desktop header. Server component
 * — the count is computed by the layout and passed in as a prop.
 */
export default function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-slate-800"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      title={unread > 0 ? `${unread} new` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
