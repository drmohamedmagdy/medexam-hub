import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import SummaryActions from "./SummaryActions";

export const metadata = { title: "File summary — MedExam Hub" };

export default async function FileSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, sp, user, locale] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    getLocale(),
  ]);
  const t = getTranslations(locale);

  const file = await prisma.fileUpload.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      filename: true,
      summaryText: true,
      summaryUrl: true,
      summaryCreatedAt: true,
      createdAt: true,
    },
  });

  if (!file || file.userId !== user.id) redirect("/exam/new");

  // Legacy: very early summaries were stored as PDFs in Vercel Blob (jsPDF
  // output). Send those users straight to the PDF — there's nothing to render
  // here for them.
  if (!file.summaryText && file.summaryUrl) {
    redirect(file.summaryUrl);
  }

  if (!file.summaryText) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/exam/new" className="text-sm text-zinc-500 hover:text-blue-600">
          &larr; {t.checkout.back ?? "Back"}
        </Link>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {file.filename}
        </h1>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t.newExam.summaryFailed}
        </p>
      </div>
    );
  }

  const blocks = parseSummary(file.summaryText);
  const autoPrint = sp.print === "1";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-full print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/exam/new" className="text-sm text-zinc-500 hover:text-blue-600">
          &larr; {t.checkout.back ?? "Back"}
        </Link>
        <SummaryActions autoPrint={autoPrint} downloadLabel={t.newExam.summaryDownload} />
      </div>

      <article className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 print:border-0 print:shadow-none print:p-0">
        <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {file.filename}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {t.newExam.summaryReady} ·{" "}
            {file.summaryCreatedAt?.toLocaleDateString(locale) ?? ""}
          </p>
        </header>

        <div className="prose prose-zinc mt-6 max-w-none dark:prose-invert print:mt-4">
          {blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      </article>
    </div>
  );
}

type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function parseSummary(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const out: Block[] = [];
  let listBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      out.push({ type: "ul", items: listBuffer });
      listBuffer = [];
    }
  };
  const flushPara = () => {
    if (paraBuffer.length > 0) {
      out.push({ type: "p", text: paraBuffer.join(" ").trim() });
      paraBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushList();
      flushPara();
      continue;
    }

    // Heading: starts with #, or **wrapped**, or ALL CAPS / Title Case followed
    // by a colon (e.g. "Key concepts:" / "Overview").
    const isMdHeading = /^#+\s+/.test(line);
    const isBoldHeading = /^\*\*.+\*\*$/.test(line);
    const isShortLabel =
      line.length < 80 &&
      /^[\p{L}\d][\p{L}\d /&\-]{1,80}:?$/u.test(line) &&
      // Avoid treating bullet items like "- Foo: bar" as headings.
      !/[.,;]/.test(line);
    if (isMdHeading || isBoldHeading || (isShortLabel && line.endsWith(":"))) {
      flushList();
      flushPara();
      out.push({
        type: "h",
        text: line.replace(/^#+\s+/, "").replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/:$/, ""),
      });
      continue;
    }

    // Bullet
    if (/^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flushPara();
      listBuffer.push(line.replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    // Continuation of paragraph
    flushList();
    paraBuffer.push(line);
  }
  flushList();
  flushPara();
  return out;
}

function Block({ block }: { block: Block }) {
  if (block.type === "h") {
    return (
      <h2 className="mt-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100 print:mt-4 print:text-base">
        {block.text}
      </h2>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="my-3 list-disc space-y-1 ps-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="my-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {block.text}
    </p>
  );
}
