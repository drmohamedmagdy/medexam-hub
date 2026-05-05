import Link from "next/link";
import { prisma } from "@/lib/db";
import { fileKind, fileKindEmoji, fileKindLabel, formatBytes } from "@/lib/library";
import { adminTogglePublishLibraryAction } from "@/app/actions/library";

export const metadata = { title: "Admin — Library" };

export default async function AdminLibraryPage() {
  const [items, agg] = await Promise.all([
    prisma.libraryResource.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.libraryResource.aggregate({
      _sum: { sizeBytes: true, downloadCount: true },
      _count: true,
    }),
  ]);

  const totalSize = agg._sum.sizeBytes ?? 0;
  const totalDownloads = agg._sum.downloadCount ?? 0;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload PDF / Word / PowerPoint / text resources for all members.
          </p>
        </div>
        <Link
          href="/admin/library/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
        >
          + Upload resource
        </Link>
      </div>

      <section className="mt-6 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total resources" value={agg._count.toLocaleString()} hint="published + drafts" />
        <Stat label="Total size" value={formatBytes(totalSize)} hint="across all files" />
        <Stat label="Total downloads" value={totalDownloads.toLocaleString()} hint="all-time" />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            No resources yet.{" "}
            <Link href="/admin/library/new" className="text-blue-600 hover:underline">
              Upload the first one
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">Title</th>
                  <th className="px-4 py-3 text-start">Category</th>
                  <th className="px-4 py-3 text-start">Type</th>
                  <th className="px-4 py-3 text-end">Size</th>
                  <th className="px-4 py-3 text-end">Downloads</th>
                  <th className="px-4 py-3 text-end">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((r) => {
                  const kind = fileKind(r.mimeType);
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/library/${r.id}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs text-zinc-500">{r.filename}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{r.category}</td>
                      <td className="px-4 py-3 text-xs">
                        <span aria-hidden>{fileKindEmoji(kind)}</span> {fileKindLabel(kind)}
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-xs">{formatBytes(r.sizeBytes)}</td>
                      <td className="px-4 py-3 text-end font-mono">{r.downloadCount}</td>
                      <td className="px-4 py-3 text-end">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {r.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex justify-end gap-2">
                          <form action={adminTogglePublishLibraryAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                              {r.isPublished ? "Unpublish" : "Publish"}
                            </button>
                          </form>
                          <Link
                            href={`/admin/library/${r.id}`}
                            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">{label}</div>
      <div className="mt-2 text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}
