import Link from "next/link";

export default function UpgradeButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-md bg-blue-600 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
    >
      {label}
    </Link>
  );
}
