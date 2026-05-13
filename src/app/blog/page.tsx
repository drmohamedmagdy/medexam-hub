import type { Metadata } from "next";
import Link from "next/link";
import { listPosts } from "./posts";

export const metadata: Metadata = {
  title: "Blog — MedExam Hub",
  description:
    "Study plans, exam tips, and high-yield topics for medical students, residents and doctors. MRCP, MRCS, USMLE, PLAB, and Egyptian board prep.",
  alternates: { canonical: "https://medexamhub.org/blog" },
  openGraph: {
    type: "website",
    title: "Blog — MedExam Hub",
    description:
      "Study plans, exam tips, and high-yield topics for medical students, residents and doctors.",
    url: "https://medexamhub.org/blog",
  },
};

export default function BlogIndexPage() {
  const posts = listPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          MedExam Hub blog
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Study plans, exam tips, and high-yield topics
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Practical write-ups for medical students, residents and doctors
          preparing for MRCP, MRCS, USMLE, PLAB, and the Egyptian boards.
        </p>
      </header>

      <section className="mt-10 space-y-5">
        {posts.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No posts yet. Check back soon.
          </p>
        ) : (
          posts.map((p) => (
            <article
              key={p.slug}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
            >
              <Link href={`/blog/${p.slug}`} className="block">
                <p className="text-xs text-zinc-500">
                  {new Date(p.date).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  • {p.author}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.excerpt}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
