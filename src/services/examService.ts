"use client";

export interface ExamAttempt {
  id: string;
  questionId: string;
  questionNumber: string;
  questionTitle?: string;
  category: string;
  userDraft: string;
  timeSpentSeconds: number;
  checkedIssues: Record<number, boolean>;
  totalIssuesCount: number;
  checkedCount: number;
  scorePercent: number;
  completedAt: string; // ISO string
}

export interface ExamReviewItem {
  questionId: string;
  questionNumber: string;
  questionTitle?: string;
  category: string;
  srsBox: number; // 1 (1 day), 2 (3 days), 3 (7 days), 4 (14 days), 5 (Mastered)
  lastReviewedAt: string; // ISO string
  nextReviewDate: string; // YYYY-MM-DD
  lastScorePercent: number;
  attemptCount: number;
}

const ATTEMPTS_KEY = "deka_exam_attempts";
const REVIEWS_KEY = "deka_exam_reviews";

// Helper: Calculate next review date based on SRS Box level
function calculateNextDate(boxLevel: number): string {
  const daysToAdd = boxLevel === 1 ? 1 : boxLevel === 2 ? 3 : boxLevel === 3 ? 7 : 14;
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split("T")[0];
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// -------------------------------------------------------------
// Attempts Management
// -------------------------------------------------------------

export function getExamAttempts(questionId?: string): ExamAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const list: ExamAttempt[] = raw ? JSON.parse(raw) : [];
    if (questionId) {
      return list.filter((a) => a.questionId === questionId);
    }
    return list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch (e) {
    console.error("Failed to load exam attempts:", e);
    return [];
  }
}

export function saveExamAttempt(attempt: Omit<ExamAttempt, "id" | "completedAt">): ExamAttempt {
  if (typeof window === "undefined") return attempt as any;
  try {
    const list = getExamAttempts();
    const newAttempt: ExamAttempt = {
      ...attempt,
      id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completedAt: new Date().toISOString(),
    };

    const updated = [newAttempt, ...list];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(updated));

    // Automatically update SRS Review status
    const isPassed = attempt.scorePercent >= 80;
    updateSrsStatus(attempt.questionId, {
      questionNumber: attempt.questionNumber,
      questionTitle: attempt.questionTitle,
      category: attempt.category,
      scorePercent: attempt.scorePercent,
      isPassed,
    });

    return newAttempt;
  } catch (e) {
    console.error("Failed to save exam attempt:", e);
    return attempt as any;
  }
}

// -------------------------------------------------------------
// SRS & Review Queue Management
// -------------------------------------------------------------

export function getReviewItems(): ExamReviewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load exam reviews:", e);
    return [];
  }
}

export function getDueReviewItems(): ExamReviewItem[] {
  const items = getReviewItems();
  const today = getTodayString();
  return items.filter((item) => item.nextReviewDate <= today && item.srsBox < 5);
}

export function updateSrsStatus(
  questionId: string,
  data: {
    questionNumber: string;
    questionTitle?: string;
    category: string;
    scorePercent: number;
    isPassed: boolean;
  }
): ExamReviewItem {
  const items = getReviewItems();
  const existingIdx = items.findIndex((i) => i.questionId === questionId);
  const nowIso = new Date().toISOString();

  let nextBox = 1;
  let attemptCount = 1;

  if (existingIdx >= 0) {
    const existing = items[existingIdx];
    attemptCount = (existing.attemptCount || 1) + 1;
    if (data.isPassed) {
      nextBox = Math.min(5, existing.srsBox + 1);
    } else {
      nextBox = 1; // Drop back to Box 1 if missed key issues
    }
  } else {
    nextBox = data.isPassed ? 2 : 1;
  }

  const updatedItem: ExamReviewItem = {
    questionId,
    questionNumber: data.questionNumber,
    questionTitle: data.questionTitle,
    category: data.category,
    srsBox: nextBox,
    lastReviewedAt: nowIso,
    nextReviewDate: calculateNextDate(nextBox),
    lastScorePercent: data.scorePercent,
    attemptCount,
  };

  if (existingIdx >= 0) {
    items[existingIdx] = updatedItem;
  } else {
    items.unshift(updatedItem);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(items));
  }

  return updatedItem;
}

export function removeReviewItem(questionId: string): void {
  if (typeof window === "undefined") return;
  const items = getReviewItems().filter((i) => i.questionId !== questionId);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(items));
}

// -------------------------------------------------------------
// Overall Statistics
// -------------------------------------------------------------

export function getExamStatistics() {
  const attempts = getExamAttempts();
  const reviewItems = getReviewItems();
  const dueItems = getDueReviewItems();

  const uniqueQuestionsDone = new Set(attempts.map((a) => a.questionId)).size;
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercent, 0) / attempts.length)
      : 0;
  const masteredCount = reviewItems.filter((i) => i.srsBox >= 5).length;

  return {
    totalAttempts: attempts.length,
    uniqueQuestionsDone,
    avgScore,
    dueReviewsCount: dueItems.length,
    activeReviewsCount: reviewItems.filter((i) => i.srsBox < 5).length,
    masteredCount,
  };
}
