import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { topupBySlug } from "@/lib/topups";
import TopupCheckoutForm from "./TopupCheckoutForm";

export const metadata = { title: "Top-up — MedExam Hub" };

export default async function TopupCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = topupBySlug(slug);
  if (!product) notFound();

  const user = await requireUser();
  const amount = product.priceEgp.toLocaleString();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/research" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Research &amp; Stats
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
        Top-up: {product.label}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        One-off purchase — adds units to your perpetual top-up pool. No
        recurring charge, no expiry.
      </p>

      <div className="mt-6 grid gap-5 sm:gap-6 lg:grid-cols-[1fr_1.2fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Order summary
          </h2>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="text-lg font-semibold">{product.label}</span>
            <span className="text-2xl font-semibold">{amount} EGP</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{product.description}</p>

          <div className="mt-6 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="text-sm font-medium">Total today</span>
            <span className="text-2xl font-semibold">{amount} EGP</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            One-time charge. Top-up never expires — drains FIFO when your
            monthly plan quota is exhausted.
          </p>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Pay
          </h2>
          <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
            <span className="text-zinc-500">Account:</span>{" "}
            <span className="font-medium">{user.email}</span>
          </div>

          <TopupCheckoutForm
            topupKind={product.kind}
            plan={user.plan === "FREE" ? "RESEARCHER" : user.plan}
            priceEgp={product.priceEgp}
          />

          <p className="mt-6 text-xs text-zinc-500">
            By paying, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-700">
              terms
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
