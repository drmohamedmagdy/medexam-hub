import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin — Exams" };

export default async function AdminExamsPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Recent exams</h1>
      <p className="mt-1 text-sm text-zinc-500">{exams.length} shown (max 100)</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {exams.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No exams yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
              <tr>
                <th className="px-4 py-3 text-start">When</th>
                <th className="px-4 py-3 text-start">User</th>
                <th className="px-4 py-3 text-start">Title</th>
                <th className="px-4 py-3 text-end">Q</th>
                <th className="px-4 py-3 text-end">Score</th>
                <th className="px-4 py-3 text-end">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {exams.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-xs">{e.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${e.userId}`}
                      className="font-medium hover:text-blue-600"
                    >
                      {e.user.name ?? e.user.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{e.title}</td>
                  <td className="px-4 py-3 text-end font-mono">{e.numQuestions}</td>
                  <td className="px-4 py-3 text-end font-mono">
                    {e.scorePct !== null ? `${Math.round(e.scorePct)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-end text-xs">
                    {e.status.toLowerCase().replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
