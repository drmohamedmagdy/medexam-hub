import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LeaderboardShareButton from "./LeaderboardShareButton";

export const metadata = { title: "Shared exam leaderboard" };

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireUser();

  const master = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      numQuestions: true,
      shareToken: true,
      createdAt: true,
    },
  });
  if (!master || master.userId !== me.id) redirect("/dashboard");

  const attempts = await prisma.exam.findMany({
    where: { sharedFromId: master.id, status: "COMPLETED" },
    select: {
      id: true,
      userId: true,
      scorePct: true,
      submittedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ scorePct: "desc" }, { submittedAt: "asc" }],
  });

  const shareUrl = master.shareToken
    ? `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://medexamhub.org"}/e/${master.shareToken}`
    : null;
  const avg =
    attempts.length === 0
      ? 0
      : attempts.reduce((s, a) => s + (a.scorePct ?? 0), 0) / attempts.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/exam/${master.id}/results`}
        className="text-sm text-zinc-500 hover:text-blue-600"
      >
        &larr; Your results
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            🏁 Leaderboard — {master.title}
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
            {attempts.length > 0 && ` · average score ${avg.toFixed(0)}%`}
            {" · "}
            {master.numQuestions} question{master.numQuestions === 1 ? "" : "s"}
          </p>
        </div>
        {attempts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/exam/${master.id}/leaderboard/podium`}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              🏆 Podium certificate
            </Link>
            <LeaderboardShareButton
              examTitle={master.title}
              shareUrl={shareUrl ?? `${process.env.PUBLIC_BASE_URL ?? "https://medexamhub.org"}/e/${master.shareToken ?? master.id}`}
              podium={attempts.slice(0, 3).map((a, i) => ({
                rank: (i + 1) as 1 | 2 | 3,
                name: a.user.name?.trim() || a.user.email.split("@")[0],
                score: Math.round(a.scorePct ?? 0),
              }))}
            />
            <Link
              href={`/exam/${master.id}/leaderboard/print`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              📄 Download PDF
            </Link>
          </div>
        )}
      </header>

      {shareUrl && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-cyan-800/60 dark:bg-cyan-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-cyan-300">
            Share link
          </p>
          <p className="mt-1 break-all font-mono text-blue-900 dark:text-cyan-200">
            {shareUrl}
          </p>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {attempts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            No one has taken this yet. Share the link above and the leaderboard
            will fill up here.
          </p>
        ) : (
          <>
          <ol>
            {attempts.map((a, idx) => {
              const name = a.user.name?.trim() || a.user.email.split("@")[0];
              const score = Math.round(a.scorePct ?? 0);
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
              const isTop3 = idx < 3;
              const rowTint = idx === 0
                ? "bg-amber-50 dark:bg-amber-950/30"
                : idx === 1
                  ? "bg-zinc-100 dark:bg-zinc-800/40"
                  : idx === 2
                    ? "bg-orange-50 dark:bg-orange-950/30"
                    : "";
              return (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 last:border-b-0 dark:border-zinc-800 ${rowTint}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-center text-base font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {medal}
                    </span>
                    <div>
                      <Link
                        href={`/u/${a.user.id}`}
                        className="block text-sm font-semibold hover:text-blue-600 dark:hover:text-cyan-400"
                      >
                        {name}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {a.submittedAt
                          ? a.submittedAt.toLocaleString()
                          : "—"}
                        {isTop3 && score >= 80 && (
                          <span className="ms-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🏆 certificate eligible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/messages/${a.user.id}`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      title="Send message"
                    >
                      ✉️
                    </Link>
                    <div className="text-lg font-semibold">{score}%</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Hint to the owner about how top-3 takers receive certificates. */}
          {attempts.some((a, i) => i < 3 && (a.scorePct ?? 0) >= 80) && (
            <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
              💡 Top-3 takers scoring ≥80% automatically see a{" "}
              <span className="font-semibold">Certificate of Excellence</span>{" "}
              banner on their own results page. Use the{" "}
              <span className="font-semibold">📢 Share top 3</span> button
              above to announce the podium on social media.
            </p>
          )}
          </>
        )}
      </section>
    </div>
  );
}
