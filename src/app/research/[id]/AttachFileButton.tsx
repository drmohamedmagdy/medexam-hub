"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { attachResearchFileAction } from "@/app/actions/research";

export default function AttachFileButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);
    setProgress(0);

    try {
      const blob = await upload(`research/${projectId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/research/upload",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("fileUrl", blob.url);
      fd.set("filePathname", blob.pathname);
      fd.set("filename", file.name);
      fd.set("mimeType", file.type || "application/octet-stream");
      fd.set("sizeBytes", String(file.size));

      const result = await attachResearchFileAction(null, fd);
      if (!result?.ok) throw new Error(result?.error ?? "Failed to attach file");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
      // Reset the input so picking the same file again triggers a new upload.
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {busy && <span className="text-xs text-zinc-500">Uploading {progress}%</span>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
        + Attach file
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv,.tsv"
          onChange={onPick}
          disabled={busy}
          className="sr-only"
        />
      </label>
    </div>
  );
}
