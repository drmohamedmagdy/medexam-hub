// One-off top-up products. Pricing is in EGP and aligns with the credit-
// redemption rate so users see a consistent "1 EGP = 1 credit = 1 unit
// equivalent" relationship across cash and credit purchase paths.

export type TopupKind = "RESEARCH_PROJECT" | "STATS_ANALYSIS";

export type TopupProduct = {
  kind: TopupKind;
  slug: string; // url path segment
  label: string;
  amount: number; // units granted per purchase
  priceEgp: number; // total cost in EGP
  description: string;
  bonusKind: "research_projects" | "stats_analyses";
};

export const TOPUP_PRODUCTS: Record<TopupKind, TopupProduct> = {
  RESEARCH_PROJECT: {
    kind: "RESEARCH_PROJECT",
    slug: "research-project",
    label: "+1 research project",
    amount: 1,
    priceEgp: 500,
    description:
      "Adds one extra research project to your Researcher-plan top-up pool. The pool never expires — use it whenever your monthly 5 are gone.",
    bonusKind: "research_projects",
  },
  STATS_ANALYSIS: {
    kind: "STATS_ANALYSIS",
    slug: "stats-analysis",
    label: "+5 statistical analyses",
    amount: 5,
    priceEgp: 50,
    description:
      "Adds 5 extra statistical analyses to your Researcher-plan top-up pool. Useful when a paper needs more tests than your monthly 25 allow.",
    bonusKind: "stats_analyses",
  },
};

export function topupBySlug(slug: string): TopupProduct | null {
  return Object.values(TOPUP_PRODUCTS).find((p) => p.slug === slug) ?? null;
}

export function topupByKind(kind: string): TopupProduct | null {
  return (TOPUP_PRODUCTS as Record<string, TopupProduct>)[kind] ?? null;
}
