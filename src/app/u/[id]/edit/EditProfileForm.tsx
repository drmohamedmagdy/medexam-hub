"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  updateProfileAction,
  removeAvatarAction,
  type ProfileState,
} from "@/app/actions/profile";

export default function EditProfileForm({
  userId,
  initialName,
  initialBio,
  initialAvatarUrl,
  initialProfilePublic,
}: {
  userId: string;
  initialName: string;
  initialBio: string;
  initialAvatarUrl: string | null;
  initialProfilePublic: boolean;
}) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarPathname, setAvatarPathname] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    null
  );

  if (state?.ok) {
    router.refresh();
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const blob = await upload(`profile/${userId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/profile/avatar",
      });
      setAvatarUrl(blob.url);
      setAvatarPathname(blob.pathname);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onRemoveAvatar() {
    await removeAvatarAction();
    setAvatarUrl(null);
    setAvatarPathname("");
    router.refresh();
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      {/* Avatar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Profile photo
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-400 dark:bg-zinc-800">
              👤
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
              {uploading ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onPickAvatar}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {uploadError && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          JPG, PNG, WebP or GIF. Max 5 MB.
        </p>
      </div>

      <input type="hidden" name="avatarUrl" value={avatarUrl ?? ""} />
      <input type="hidden" name="avatarPathname" value={avatarPathname} />

      {/* Name */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm">
          <span className="block font-medium">Display name</span>
          <input
            name="name"
            type="text"
            maxLength={120}
            defaultValue={initialName}
            placeholder="Your full name"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
          />
        </label>
      </div>

      {/* Bio */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm">
          <span className="block font-medium">Bio</span>
          <textarea
            name="bio"
            rows={5}
            maxLength={1000}
            defaultValue={initialBio}
            placeholder="Tell other users a bit about yourself — specialty, university, what you're studying for…"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800/40"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Up to 1000 characters.
          </span>
        </label>
      </div>

      {/* Privacy */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="profilePublic"
            defaultChecked={initialProfilePublic}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-medium">Public profile</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              When on, anyone signed in can see your bio, exam stats, and send
              you a direct message. Turn off to hide everything except your
              display name.
            </span>
          </span>
        </label>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Profile saved ✓
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
