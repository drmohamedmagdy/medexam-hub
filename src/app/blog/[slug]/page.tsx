import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS_BY_SLUG, listPosts } from "../posts";
import { renderMarkdown } from "../renderMarkdown";

export async function generateStaticParams() {
  return Object.keys(POSTS_BY_SLUG).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS_BY_SLUG[slug];
  if (!post) return {};
  const canonical = `https://medexamhub.org/blog/${slug}`;
  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.metaDescription,
      url: canonical,
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: "/logo.png", width: 512, height: 512 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS_BY_SLUG[slug];
  if (!post) return notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    author: { "@type": "Organization", name: post.author },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "MedExam Hub",
      logo: { "@type": "ImageObject", url: "https://medexamhub.org/logo.png" },
    },
    mainEntityOfPage: `https://medexamhub.org/blog/${slug}`,
  };

  const other = listPosts().filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/blog" className="text-sm text-zinc-500 hover:text-blue-600">
          ← All posts
        </Link>

        <header className="mt-5">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            {new Date(post.date).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            • {post.author}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        </header>

        <section className="mt-6">{renderMarkdown(post.content)}</section>

        {/* CTA at the bottom of every post */}
        <section className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
            Practice what you just read
          </h2>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            Generate your first AI-powered exam in 30 seconds. Free plan
            includes 20 questions/month.
          </p>
          <Link
            href="/signup?next=/exam/new"
            className="mt-4 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Start free →
          </Link>
        </section>

        {other.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Read next
            </h2>
            <ul className="mt-4 space-y-3">
              {other.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
