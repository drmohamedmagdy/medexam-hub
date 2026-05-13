// Minimal markdown → JSX renderer. Handles the subset we use in blog
// posts: headings (## ###), paragraphs, bullet lists, bold, italic,
// inline code, and links. Deliberately tiny — when we need tables or
// images we'll swap to react-markdown.

import { Fragment, type ReactNode } from "react";

const INLINE_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
const INLINE_BOLD = /\*\*([^*]+)\*\*/g;
const INLINE_ITALIC = /(^|[^*])\*([^*]+)\*/g;
const INLINE_CODE = /`([^`]+)`/g;

function renderInline(text: string): ReactNode {
  // Apply transformations in order — bold before italic so **x** doesn't
  // become an italic match. Returns array of strings/elements.
  const parts: ReactNode[] = [];
  let cursor = 0;
  const tokens: Array<{ start: number; end: number; node: ReactNode }> = [];
  // Pass 1: collect link spans.
  let m: RegExpExecArray | null;
  INLINE_LINK.lastIndex = 0;
  while ((m = INLINE_LINK.exec(text)) !== null) {
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <a
          key={`l-${m.index}`}
          href={m[2]}
          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
          target={m[2].startsWith("http") ? "_blank" : undefined}
          rel={m[2].startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {m[1]}
        </a>
      ),
    });
  }
  tokens.sort((a, b) => a.start - b.start);

  function pushText(slice: string) {
    if (!slice) return;
    // Now apply bold / italic / code on the plain slice.
    let s = slice;
    // Code first so backticks aren't eaten by bold.
    const segments: ReactNode[] = [];
    let lastIdx = 0;
    INLINE_CODE.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = INLINE_CODE.exec(s)) !== null) {
      if (cm.index > lastIdx) {
        segments.push(applyBoldItalic(s.slice(lastIdx, cm.index), `${slice.length}-${cm.index}`));
      }
      segments.push(
        <code
          key={`c-${cm.index}`}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800"
        >
          {cm[1]}
        </code>
      );
      lastIdx = cm.index + cm[0].length;
    }
    if (lastIdx < s.length) {
      segments.push(applyBoldItalic(s.slice(lastIdx), `${slice.length}-end`));
    }
    parts.push(<Fragment key={`s-${parts.length}`}>{segments}</Fragment>);
  }

  for (const t of tokens) {
    if (t.start > cursor) pushText(text.slice(cursor, t.start));
    parts.push(t.node);
    cursor = t.end;
  }
  if (cursor < text.length) pushText(text.slice(cursor));
  return <>{parts}</>;
}

function applyBoldItalic(s: string, keyBase: string): ReactNode {
  // bold first
  const segments: ReactNode[] = [];
  let lastIdx = 0;
  INLINE_BOLD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_BOLD.exec(s)) !== null) {
    if (m.index > lastIdx) segments.push(italicize(s.slice(lastIdx, m.index), `${keyBase}-${m.index}`));
    segments.push(
      <strong key={`b-${keyBase}-${m.index}`} className="font-semibold">
        {m[1]}
      </strong>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < s.length) segments.push(italicize(s.slice(lastIdx), `${keyBase}-end`));
  return <Fragment key={keyBase}>{segments}</Fragment>;
}

function italicize(s: string, key: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  INLINE_ITALIC.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_ITALIC.exec(s)) !== null) {
    const start = m.index + (m[1]?.length ?? 0);
    if (start > lastIdx) parts.push(s.slice(lastIdx, start));
    parts.push(
      <em key={`i-${key}-${m.index}`} className="italic">
        {m[2]}
      </em>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < s.length) parts.push(s.slice(lastIdx));
  return <Fragment key={`it-${key}`}>{parts}</Fragment>;
}

export function renderMarkdown(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="mt-4 leading-relaxed text-zinc-700 dark:text-zinc-300">
          {renderInline(para.join(" "))}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length) {
      blocks.push(
        <ul key={`u-${blocks.length}`} className="mt-4 list-disc space-y-1 pl-6 text-zinc-700 dark:text-zinc-300">
          {list.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-6 text-base font-semibold tracking-tight">
          {renderInline(line.replace(/^###\s+/, ""))}
        </h3>
      );
    } else if (/^##\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-8 text-xl font-bold tracking-tight">
          {renderInline(line.replace(/^##\s+/, ""))}
        </h2>
      );
    } else if (/^-\s+/.test(line)) {
      flushPara();
      list = list ?? [];
      list.push(line.replace(/^-\s+/, ""));
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}
