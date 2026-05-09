import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EditProfileForm from "./EditProfileForm";
import GalleryManager from "./GalleryManager";

export const metadata = { title: "Edit profile — MedExam Hub" };

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (user.id !== id) redirect(`/u/${id}`);

  const media = await prisma.profileMedia.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, kind: true, url: true, caption: true, mimeType: true },
  });

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
        Photo, bio, gallery, and visibility for other users.
      </p>

      <EditProfileForm
        userId={user.id}
        initialName={user.name ?? ""}
        initialBio={user.bio ?? ""}
        initialAvatarUrl={user.avatarUrl}
        initialProfilePublic={user.profilePublic}
      />

      <GalleryManager media={media} />
    </div>
  );
}
