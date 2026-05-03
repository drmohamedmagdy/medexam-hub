import Link from "next/link";
import type { Plan } from "@/generated/prisma/client";

export default function UpgradeButton({ plan, label }: { plan: Plan; label: string }) {
  return (
    <Link
      href={`/checkout/${plan.toLowerCase()}`}
      className="block w-full rounded-md bg-blue-600 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
    >
      {label}
    </Link>
  );
}
