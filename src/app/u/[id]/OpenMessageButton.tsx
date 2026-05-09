"use client";

import Link from "next/link";

export default function OpenMessageButton({ userId }: { userId: string }) {
  return (
    <Link
      href={`/messages/${userId}`}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
    >
      ✉️ Send message
    </Link>
  );
}
