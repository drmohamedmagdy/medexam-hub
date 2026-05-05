import { prisma } from "@/lib/db";
import { getStudyStreak } from "@/lib/streak";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Tier sets the badge color band — affects nothing else. */
  tier: "bronze" | "silver" | "gold" | "diamond";
  /** Returns true if the user qualifies for this achievement. */
  qualifies: (stats: UserStats) => boolean;
};

export type UserStats = {
  completedExamCount: number;
  bestScore: number;       // 0-100
  has100Score: boolean;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  uniqueSpecialties: number;
  fileUploads: number;
  streak: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_exam",
    title: "First step",
    description: "Completed your first AI exam",
    emoji: "🎯",
    tier: "bronze",
    qualifies: (s) => s.completedExamCount >= 1,
  },
  {
    id: "five_exams",
    title: "Building momentum",
    description: "Completed 5 AI exams",
    emoji: "⚡",
    tier: "bronze",
    qualifies: (s) => s.completedExamCount >= 5,
  },
  {
    id: "ten_exams",
    title: "Committed learner",
    description: "Completed 10 AI exams",
    emoji: "📚",
    tier: "silver",
    qualifies: (s) => s.completedExamCount >= 10,
  },
  {
    id: "twenty_five_exams",
    title: "Dedicated",
    description: "Completed 25 AI exams",
    emoji: "🏆",
    tier: "gold",
    qualifies: (s) => s.completedExamCount >= 25,
  },
  {
    id: "fifty_exams",
    title: "Veteran",
    description: "Completed 50 AI exams",
    emoji: "👑",
    tier: "diamond",
    qualifies: (s) => s.completedExamCount >= 50,
  },
  {
    id: "high_scorer",
    title: "High scorer",
    description: "Scored 90% or higher on an exam",
    emoji: "🌟",
    tier: "silver",
    qualifies: (s) => s.bestScore >= 90,
  },
  {
    id: "perfect_score",
    title: "Flawless",
    description: "Got a 100% score on an exam",
    emoji: "💯",
    tier: "diamond",
    qualifies: (s) => s.has100Score,
  },
  {
    id: "century",
    title: "Century",
    description: "Answered 100+ questions",
    emoji: "💪",
    tier: "silver",
    qualifies: (s) => s.totalQuestionsAnswered >= 100,
  },
  {
    id: "thousand_questions",
    title: "Marathon mind",
    description: "Answered 1,000+ questions",
    emoji: "🚀",
    tier: "diamond",
    qualifies: (s) => s.totalQuestionsAnswered >= 1000,
  },
  {
    id: "polymath",
    title: "Polymath",
    description: "Tried 5+ different specialties",
    emoji: "🌐",
    tier: "silver",
    qualifies: (s) => s.uniqueSpecialties >= 5,
  },
  {
    id: "explorer",
    title: "Explorer",
    description: "Tried 10+ different specialties",
    emoji: "🗺️",
    tier: "gold",
    qualifies: (s) => s.uniqueSpecialties >= 10,
  },
  {
    id: "first_upload",
    title: "Bring your own notes",
    description: "Uploaded your first study file",
    emoji: "📄",
    tier: "bronze",
    qualifies: (s) => s.fileUploads >= 1,
  },
  {
    id: "streak_3",
    title: "On a roll",
    description: "3-day study streak",
    emoji: "🔥",
    tier: "bronze",
    qualifies: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    title: "Weekly warrior",
    description: "7-day study streak",
    emoji: "🔥",
    tier: "silver",
    qualifies: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    title: "Unstoppable",
    description: "30-day study streak",
    emoji: "🔥",
    tier: "diamond",
    qualifies: (s) => s.streak >= 30,
  },
];

export function tierColor(tier: Achievement["tier"]): {
  bg: string;
  ring: string;
  text: string;
} {
  switch (tier) {
    case "bronze":
      return {
        bg: "bg-gradient-to-br from-orange-200 to-amber-300 dark:from-orange-900/40 dark:to-amber-900/40",
        ring: "ring-orange-300/50 dark:ring-orange-700/40",
        text: "text-orange-900 dark:text-orange-200",
      };
    case "silver":
      return {
        bg: "bg-gradient-to-br from-slate-200 to-zinc-300 dark:from-slate-800/60 dark:to-zinc-800/60",
        ring: "ring-slate-300/50 dark:ring-slate-600/40",
        text: "text-slate-900 dark:text-slate-200",
      };
    case "gold":
      return {
        bg: "bg-gradient-to-br from-yellow-200 to-amber-300 dark:from-yellow-900/40 dark:to-amber-900/40",
        ring: "ring-yellow-400/50 dark:ring-yellow-600/40",
        text: "text-yellow-900 dark:text-yellow-200",
      };
    case "diamond":
      return {
        bg: "bg-gradient-to-br from-cyan-200 to-violet-300 dark:from-cyan-900/40 dark:to-violet-900/40",
        ring: "ring-cyan-400/50 dark:ring-cyan-600/40",
        text: "text-cyan-900 dark:text-cyan-200",
      };
  }
}

export async function loadUserStats(userId: string): Promise<UserStats> {
  const [
    totalQuestionsAnswered,
    totalCorrect,
    completedExamsRaw,
    fileUploads,
    specialties,
    streak,
  ] = await Promise.all([
    prisma.question.count({
      where: { exam: { userId, status: "COMPLETED" } },
    }),
    prisma.question.count({
      where: { exam: { userId, status: "COMPLETED" }, isCorrect: true },
    }),
    prisma.exam.findMany({
      where: { userId, status: "COMPLETED" },
      select: { scorePct: true },
    }),
    prisma.fileUpload.count({ where: { userId } }),
    prisma.exam.findMany({
      where: { userId, specialty: { not: null } },
      distinct: ["specialty"],
      select: { specialty: true },
    }),
    getStudyStreak(userId),
  ]);

  const scores = completedExamsRaw
    .map((e) => e.scorePct)
    .filter((s): s is number => typeof s === "number");
  const bestScore = scores.length ? Math.round(Math.max(...scores)) : 0;
  const has100Score = scores.some((s) => s >= 99.99);

  return {
    completedExamCount: completedExamsRaw.length,
    bestScore,
    has100Score,
    totalQuestionsAnswered,
    totalCorrect,
    uniqueSpecialties: specialties.length,
    fileUploads,
    streak,
  };
}

export function parseUnlocked(json: string | null): Set<string> {
  if (!json) return new Set();
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function serializeUnlocked(set: Set<string>): string {
  return JSON.stringify(Array.from(set));
}

/**
 * Detect newly-unlocked achievements for a user. Persists the new set to
 * User.achievements. Returns the list of newly-unlocked achievements so the
 * caller can create notifications / show toasts for them.
 */
export async function detectAndPersistAchievements(
  userId: string,
  prevAchievementsJson: string | null
): Promise<Achievement[]> {
  const stats = await loadUserStats(userId);
  const unlocked = parseUnlocked(prevAchievementsJson);
  const newly: Achievement[] = [];

  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    if (a.qualifies(stats)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }

  if (newly.length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { achievements: serializeUnlocked(unlocked) },
    });
  }

  return newly;
}

/** Read-only computation of all achievements with their unlock status. */
export async function getAchievementProgress(
  userId: string,
  achievementsJson: string | null
): Promise<Array<Achievement & { unlocked: boolean }>> {
  const stats = await loadUserStats(userId);
  const unlocked = parseUnlocked(achievementsJson);
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlocked.has(a.id) || a.qualifies(stats),
  }));
}
