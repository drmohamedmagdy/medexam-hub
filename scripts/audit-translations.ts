/**
 * Translation completeness + freshness audit.
 *
 * The Translations type already forces every key to exist in every
 * locale (TypeScript wouldn't compile otherwise). What it cannot
 * detect is *untranslated* strings — i.e. an Arabic / French / etc.
 * value that's identical to the English source, which means someone
 * copy-pasted EN and never translated it.
 *
 * Reports per-locale how many strings still match English verbatim,
 * plus a sample of the worst offenders so we know where to focus a
 * translator pass.
 */

import { LOCALES, type Locale } from "../src/lib/i18n";
import { getTranslations } from "../src/lib/i18n";

type Hit = { path: string; en: string };

function walk(
  enNode: unknown,
  otherNode: unknown,
  path: string,
  hits: Hit[]
): { total: number; matches: number } {
  if (typeof enNode === "string") {
    if (typeof otherNode === "string") {
      const matches = enNode === otherNode;
      if (matches) hits.push({ path, en: enNode });
      return { total: 1, matches: matches ? 1 : 0 };
    }
    return { total: 1, matches: 1 };
  }
  if (Array.isArray(enNode)) {
    let total = 0;
    let matches = 0;
    enNode.forEach((item, i) => {
      const r = walk(
        item,
        Array.isArray(otherNode) ? otherNode[i] : undefined,
        `${path}[${i}]`,
        hits
      );
      total += r.total;
      matches += r.matches;
    });
    return { total, matches };
  }
  if (enNode && typeof enNode === "object") {
    let total = 0;
    let matches = 0;
    for (const k of Object.keys(enNode as Record<string, unknown>)) {
      const r = walk(
        (enNode as Record<string, unknown>)[k],
        otherNode && typeof otherNode === "object"
          ? (otherNode as Record<string, unknown>)[k]
          : undefined,
        path ? `${path}.${k}` : k,
        hits
      );
      total += r.total;
      matches += r.matches;
    }
    return { total, matches };
  }
  return { total: 0, matches: 0 };
}

function main() {
  const en = getTranslations("en");

  console.log("Translation freshness audit\n");
  console.log("Per-locale: how many strings still match English verbatim.\n");

  const allHits: Record<Locale, Hit[]> = {} as Record<Locale, Hit[]>;
  let enTotal = 0;

  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const t = getTranslations(locale);
    const hits: Hit[] = [];
    const r = walk(en, t, "", hits);
    enTotal = r.total;
    allHits[locale] = hits;
    const pct = Math.round((hits.length / r.total) * 100);
    console.log(
      `  ${locale.padEnd(3)}  ${String(hits.length).padStart(4)}/${r.total}  (${pct}% untranslated)`
    );
  }

  console.log(`\n(English baseline: ${enTotal} strings)\n`);

  // Worst offenders per locale — first 8 untranslated strings each.
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const hits = allHits[locale];
    if (hits.length === 0) continue;
    console.log(`\n— ${locale} — sample untranslated strings (${hits.length} total):`);
    for (const h of hits.slice(0, 8)) {
      const preview = h.en.length > 80 ? h.en.slice(0, 77) + "…" : h.en;
      console.log(`    ${h.path}\n      ${JSON.stringify(preview)}`);
    }
  }

  // Aggregate: which keys are universally untranslated across all
  // non-EN locales? Those are the highest-leverage to fix once.
  const keyCounts = new Map<string, number>();
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    for (const h of allHits[locale] ?? []) {
      keyCounts.set(h.path, (keyCounts.get(h.path) ?? 0) + 1);
    }
  }
  const universal = [...keyCounts.entries()]
    .filter(([, n]) => n === LOCALES.length - 1)
    .map(([k]) => k);
  console.log(
    `\nKeys never translated in ANY non-EN locale: ${universal.length}`
  );
  for (const k of universal) {
    console.log(`  ${k}`);
  }
}

main();
