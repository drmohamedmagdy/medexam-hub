import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        🔍
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          My dashboard
        </Link>
      </div>
    </div>
  );
}
