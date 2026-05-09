/**
 * SM-2-flavoured scheduler for review cards.
 *
 * Grades the user can give a card on review:
 *   - "again" : missed it again — reset reps, short relearn step
 *   - "hard"  : recalled with difficulty
 *   - "good"  : recalled correctly
 *   - "easy"  : recalled instantly, can stretch the interval more
 *
 * The math is intentionally simple — close to classic SM-2 with sane
 * defaults. We don't try to outdo Anki/FSRS here, just give users a
 * dependable daily review queue.
 */

export type ReviewGrade = "again" | "hard" | "good" | "easy";
export type CardState = "new" | "learning" | "review" | "relearning";

export type CardSnapshot = {
  state: CardState;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
};

export type CardUpdate = {
  state: CardState;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  due: Date;
  lastReviewedAt: Date;
};

const MIN_EASE = 1.3;
const RELEARN_INTERVAL_DAYS = 10 / (24 * 60); // 10 minutes
const FIRST_GOOD_INTERVAL = 1; // days
const SECOND_GOOD_INTERVAL = 6; // days

export function applyGrade(
  card: CardSnapshot,
  grade: ReviewGrade,
  now: Date = new Date()
): CardUpdate {
  let { state, intervalDays, ease, reps, lapses } = card;

  if (grade === "again") {
    lapses += 1;
    reps = 0;
    intervalDays = RELEARN_INTERVAL_DAYS;
    ease = Math.max(MIN_EASE, ease - 0.2);
    state = "relearning";
  } else if (grade === "hard") {
    if (reps === 0) {
      intervalDays = FIRST_GOOD_INTERVAL;
    } else {
      intervalDays = Math.max(intervalDays * 1.2, intervalDays + 1);
    }
    ease = Math.max(MIN_EASE, ease - 0.15);
    reps += 1;
    state = "review";
  } else if (grade === "good") {
    if (reps === 0) {
      intervalDays = FIRST_GOOD_INTERVAL;
    } else if (reps === 1) {
      intervalDays = SECOND_GOOD_INTERVAL;
    } else {
      intervalDays = intervalDays * ease;
    }
    reps += 1;
    state = "review";
  } else {
    // easy
    if (reps === 0) {
      intervalDays = FIRST_GOOD_INTERVAL * 1.3;
    } else if (reps === 1) {
      intervalDays = SECOND_GOOD_INTERVAL * 1.3;
    } else {
      intervalDays = intervalDays * ease * 1.3;
    }
    ease = ease + 0.15;
    reps += 1;
    state = "review";
  }

  const due = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { state, intervalDays, ease, reps, lapses, due, lastReviewedAt: now };
}

export function gradeLabel(grade: ReviewGrade): string {
  switch (grade) {
    case "again":
      return "Again";
    case "hard":
      return "Hard";
    case "good":
      return "Good";
    case "easy":
      return "Easy";
  }
}

export function formatNextDue(intervalDays: number): string {
  if (intervalDays < 1 / 24) {
    const mins = Math.max(1, Math.round(intervalDays * 24 * 60));
    return `${mins}m`;
  }
  if (intervalDays < 1) {
    const hrs = Math.max(1, Math.round(intervalDays * 24));
    return `${hrs}h`;
  }
  if (intervalDays < 30) {
    return `${Math.round(intervalDays)}d`;
  }
  if (intervalDays < 365) {
    return `${Math.round(intervalDays / 30)}mo`;
  }
  return `${(intervalDays / 365).toFixed(1)}y`;
}
