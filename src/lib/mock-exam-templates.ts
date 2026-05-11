export type MockBlock = {
  questions: number;
  timeLimitMin: number;
  /** Optional hint to keep block content thematically separated. */
  topicHint?: string;
};

export type MockTemplate = {
  id: string;
  label: string;
  description: string;
  examType: string;
  blocks: MockBlock[];
  /** Recommended break between blocks (minutes). UI shows a countdown. */
  breakBetweenBlocksMin: number;
};

/**
 * First-pass mock templates — "mini" sizes so AI generation stays
 * within sensible cost/time bounds. Full-size templates (USMLE Step 1
 * = 7×40×60min) can be added later; the take/grade infra is the same.
 */
export const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "usmle-step1-mini",
    label: "USMLE Step 1 — Mini Mock",
    description:
      "Quick simulation: 2 blocks × 20 questions × 30 min each, 5-minute break.",
    examType: "USMLE Step 1",
    blocks: [
      { questions: 20, timeLimitMin: 30 },
      { questions: 20, timeLimitMin: 30 },
    ],
    breakBetweenBlocksMin: 5,
  },
  {
    id: "usmle-step2-mini",
    label: "USMLE Step 2 CK — Mini Mock",
    description: "2 blocks × 25 questions × 35 min each, 5-minute break.",
    examType: "USMLE Step 2 CK",
    blocks: [
      { questions: 25, timeLimitMin: 35 },
      { questions: 25, timeLimitMin: 35 },
    ],
    breakBetweenBlocksMin: 5,
  },
  {
    id: "mrcp-part1-mini",
    label: "MRCP Part 1 — Mini Mock",
    description: "2 blocks × 30 questions × 45 min each, 10-minute break.",
    examType: "MRCP Part 1",
    blocks: [
      { questions: 30, timeLimitMin: 45 },
      { questions: 30, timeLimitMin: 45 },
    ],
    breakBetweenBlocksMin: 10,
  },
  {
    id: "mrcs-parta-mini",
    label: "MRCS Part A — Mini Mock",
    description: "2 blocks × 30 questions × 45 min each, 10-minute break.",
    examType: "MRCS Part A",
    blocks: [
      { questions: 30, timeLimitMin: 45 },
      { questions: 30, timeLimitMin: 45 },
    ],
    breakBetweenBlocksMin: 10,
  },
  {
    id: "plab-1-mini",
    label: "PLAB 1 — Mini Mock",
    description: "2 blocks × 30 questions × 45 min each.",
    examType: "PLAB 1",
    blocks: [
      { questions: 30, timeLimitMin: 45 },
      { questions: 30, timeLimitMin: 45 },
    ],
    breakBetweenBlocksMin: 10,
  },
];

export function findTemplate(id: string): MockTemplate | null {
  return MOCK_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function totalQuestions(t: MockTemplate): number {
  return t.blocks.reduce((s, b) => s + b.questions, 0);
}

export function totalMinutes(t: MockTemplate): number {
  return (
    t.blocks.reduce((s, b) => s + b.timeLimitMin, 0) +
    t.breakBetweenBlocksMin * Math.max(0, t.blocks.length - 1)
  );
}
