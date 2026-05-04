import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <span className="font-semibold">Admin</span>
        <span className="text-amber-700 dark:text-amber-300">·</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:underline">Overview</Link>
          <Link href="/admin/users" className="hover:underline">Users</Link>
          <Link href="/admin/payments" className="hover:underline">Payments</Link>
          <Link href="/admin/exams" className="hover:underline">Exams</Link>
          <Link href="/admin/promos" className="hover:underline">Promos</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
