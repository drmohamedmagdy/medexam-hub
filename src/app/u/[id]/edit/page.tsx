import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import EditProfileForm from "./EditProfileForm";

export const metadata = { title: "Edit profile — MedExam Hub" };

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (user.id !== id) redirect(`/u/${id}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/u/${user.id}`}
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Back to profile
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Edit your profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Photo, name, bio, and visibility. Manage gallery, files, and articles
        from{" "}
        <Link
          href={`/u/${user.id}/content`}
          className="text-blue-600 hover:underline dark:text-cyan-400"
        >
          My content
        </Link>
        .
      </p>

      <EditProfileForm
        userId={user.id}
        initialName={user.name ?? ""}
        initialBio={user.bio ?? ""}
        initialAvatarUrl={user.avatarUrl}
        initialProfilePublic={user.profilePublic}
      />
    </div>
  );
}
