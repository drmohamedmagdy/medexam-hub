import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 sm:mb-6 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Admin</span>
          <span className="hidden text-amber-700 dark:text-amber-300 sm:inline">·</span>
          <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-1 text-sm sm:gap-4">
            <AdminLink href="/admin">Overview</AdminLink>
            <AdminLink href="/admin/users">Users</AdminLink>
            <AdminLink href="/admin/payments">Payments</AdminLink>
            <AdminLink href="/admin/exams">Exams</AdminLink>
            <AdminLink href="/admin/promos">Promos</AdminLink>
            <AdminLink href="/admin/credits">Credits</AdminLink>
            <AdminLink href="/admin/email">Emails</AdminLink>
            <AdminLink href="/admin/library">Library</AdminLink>
            <AdminLink href="/admin/courses">Courses</AdminLink>
            <AdminLink href="/admin/errors">Errors</AdminLink>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 whitespace-nowrap py-1 hover:underline"
    >
      {children}
    </Link>
  );
}
