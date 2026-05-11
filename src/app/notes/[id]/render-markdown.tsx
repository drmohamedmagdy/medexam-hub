import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown → JSX renderer scoped to what the study-note prompt
 * produces: ## / ### headings, * / - bullet lists, **bold**, *italic*,
 * `code`, and blank-line-separated paragraphs.
 *
 * No external dependency; the AI output is from our own prompt so we
 * control the surface area. If we need full markdown later, swap this
 * for react-markdown without changing the call site.
 */
export function renderMarkdown(src: string): ReactNode {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings — h1 is unlikely; h2/h3 are the staples.
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      blocks.push(<h2 key={key++}>{inline(h2[1])}</h2>);
      i++;
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      blocks.push(<h3 key={key++}>{inline(h3[1])}</h3>);
      i++;
      continue;
    }
    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      blocks.push(<h2 key={key++}>{inline(h1[1])}</h2>);
      i++;
      continue;
    }

    // Bullet list — consume contiguous lines starting with - or *.
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((it, ix) => (
            <li key={ix}>{inline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — same handling.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((it, ix) => (
            <li key={ix}>{inline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph — consume until blank line or a block-level start.
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    if (paragraph.length > 0) {
      blocks.push(<p key={key++}>{inline(paragraph.join(" "))}</p>);
    }
  }

  return <Fragment>{blocks}</Fragment>;
}

/**
 * Inline transforms: **bold**, *italic*, and `code` spans. Done with a
 * single regex sweep to preserve order and avoid the nested-replace
 * footguns. Anything outside the patterns is rendered as-is.
 */
function inline(s: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > lastIndex) out.push(s.slice(lastIndex, m.index));
    if (m[2] !== undefined) {
      out.push(<strong key={key++}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      out.push(<em key={key++}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      out.push(<code key={key++}>{m[4]}</code>);
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < s.length) out.push(s.slice(lastIndex));
  return out.length === 1 ? out[0] : <Fragment>{out}</Fragment>;
}
