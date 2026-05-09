import Link from "next/link";
import UploadForm from "./UploadForm";

export const metadata = { title: "Admin — Upload course" };

export default function NewCoursePage() {
  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to courses
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Upload a course</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Videos stream directly to Vercel Blob (up to 2 GB). All published courses are
        visible to every signed-in member.
      </p>
      <UploadForm />
    </div>
  );
}
