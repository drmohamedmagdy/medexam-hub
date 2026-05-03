"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Plan } from "@/generated/prisma/client";

const STORAGE_KEY_PREFIX = "mxh_dismiss_upgrade_";

const HREF: Record<"FREE" | "BASIC" | "PRO", string> = {
  FREE: "/checkout/basic",
  BASIC: "/checkout/pro",
  PRO: "/checkout/premium",
};

export default function UpgradeBanner({
  plan,
  copy,
  dismissLabel,
}: {
  plan: Plan;
  copy: { title: string; body: string; cta: string } | undefined;
  dismissLabel: string;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!copy) return;
    const dismissed = localStorage.getItem(STORAGE_KEY_PREFIX + plan);
    if (!dismissed) setHidden(false);
  }, [copy, plan]);

  if (!copy || hidden) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY_PREFIX + plan, String(Date.now()));
    setHidden(true);
  }

  const href = HREF[plan as "FREE" | "BASIC" | "PRO"];

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-blue-900 dark:text-blue-100">{copy.title}</p>
        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">{copy.body}</p>
      </div>
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <Link
          href={href}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {copy.cta}
        </Link>
        <button
          onClick={dismiss}
          className="rounded-md px-3 py-2 text-sm text-blue-800 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
