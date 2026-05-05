import Link from "next/link";
import UploadForm from "./UploadForm";

export const metadata = { title: "Admin — Upload library resource" };

export default function NewLibraryResourcePage() {
  return (
    <div>
      <Link href="/admin/library" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to library
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Upload a resource</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Files are stored in the database. All members (including Free) can view and download
        published resources.
      </p>
      <UploadForm />
    </div>
  );
}
