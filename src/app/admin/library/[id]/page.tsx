import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fileKind, fileKindEmoji, fileKindLabel, formatBytes } from "@/lib/library";
import { adminDeleteLibraryAction } from "@/app/actions/library";
import EditForm from "./EditForm";

export const metadata = { title: "Admin — Edit library resource" };

export default async function EditLibraryResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await prisma.libraryResource.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      coverUrl: true,
      downloadCount: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!r) notFound();

  const kind = fileKind(r.mimeType);

  return (
    <div>
      <Link href="/admin/library" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to library
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{r.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span aria-hidden>{fileKindEmoji(kind)}</span> {fileKindLabel(kind)} ·{" "}
            {formatBytes(r.sizeBytes)} · {r.downloadCount} downloads · uploaded{" "}
            {r.createdAt.toLocaleDateString()}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{r.filename}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/library/${r.id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Preview
          </a>
          <a
            href={`/api/library/${r.id}/download`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Download
          </a>
          <form action={adminDeleteLibraryAction}>
            <input type="hidden" name="id" value={r.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <EditForm
        defaults={{
          id: r.id,
          title: r.title,
          description: r.description ?? "",
          category: r.category,
          isPublished: r.isPublished,
          coverUrl: r.coverUrl,
        }}
      />
    </div>
  );
}
