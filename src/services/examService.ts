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
  relatedSections?: { law?: string; section: string }[];
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

const SIMULATIONS_KEY = "deka_exam_simulations";

export interface ExamSimulation {
  id: string;
  title: string;
  category: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  timeSpentSeconds: number;
  completedAt: string;
  overallScorePercent: number;
  strictMode: boolean;
  questions: {
    questionId: string;
    questionNumber: string;
    questionTitle?: string;
    category: string;
    facts: string;
    prompt: string;
    officialAnswer: string;
    keyIssues: string[];
    relatedSections?: { law?: string; section: string }[];
    userDraft: string;
    scorePercent: number;
    checkedIssues: Record<number, boolean>;
    totalIssuesCount: number;
    checkedCount: number;
    flagged?: boolean;
    aiEvaluation?: any;
  }[];
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

// -------------------------------------------------------------
// Simulation Storage
// -------------------------------------------------------------

export function getSimulations(): ExamSimulation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIMULATIONS_KEY);
    const list: ExamSimulation[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch (e) {
    console.error("Failed to load exam simulations:", e);
    return [];
  }
}

export function saveSimulation(sim: Omit<ExamSimulation, "id" | "completedAt">): ExamSimulation {
  if (typeof window === "undefined") return sim as any;
  try {
    const list = getSimulations();
    const newSim: ExamSimulation = {
      ...sim,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completedAt: new Date().toISOString(),
    };

    const updated = [newSim, ...list];
    localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(updated));

    // Also record each question as an individual ExamAttempt
    sim.questions.forEach((q) => {
      if (q.userDraft && q.userDraft.trim()) {
        saveExamAttempt({
          questionId: q.questionId,
          questionNumber: q.questionNumber,
          questionTitle: q.questionTitle,
          category: q.category,
          userDraft: q.userDraft,
          timeSpentSeconds: Math.round(sim.timeSpentSeconds / sim.questions.length),
          checkedIssues: q.checkedIssues || {},
          totalIssuesCount: q.totalIssuesCount || q.keyIssues?.length || 0,
          checkedCount: q.checkedCount || 0,
          scorePercent: q.scorePercent || 0,
          relatedSections: q.relatedSections,
        });
      }
    });

    return newSim;
  } catch (e) {
    console.error("Failed to save simulation:", e);
    return sim as any;
  }
}

// -------------------------------------------------------------
// Advanced Analytics & Heatmap
// -------------------------------------------------------------

export interface CategoryPerformance {
  category: string;
  totalAttempts: number;
  avgScore: number;
  passedCount: number;
  status: "mastered" | "good" | "weak" | "unattempted";
}

export function getCategoryPerformance(): CategoryPerformance[] {
  const attempts = getExamAttempts();
  const categoryMap: Record<string, { totalScore: number; count: number; passed: number }> = {};

  attempts.forEach((a) => {
    if (!categoryMap[a.category]) {
      categoryMap[a.category] = { totalScore: 0, count: 0, passed: 0 };
    }
    categoryMap[a.category].totalScore += a.scorePercent;
    categoryMap[a.category].count += 1;
    if (a.scorePercent >= 80) categoryMap[a.category].passed += 1;
  });

  const allCategories = [
    "1. กฎหมายแพ่งและพาณิชย์",
    "2. กฎหมายอาญา",
    "3. กฎหมายวิธีพิจารณาความแพ่ง",
    "4. กฎหมายวิธีพิจารณาความอาญา",
    "5. กฎหมายล้มละลายและการฟื้นฟูกิจการ",
    "6. กฎหมายแรงงาน",
    "7. กฎหมายภาษีอากร",
    "8. กฎหมายทรัพย์สินทางปัญญาและการค้าระหว่างประเทศ",
    "9. กฎหมายปกครองและวิธีพิจารณาคดีปกครอง",
  ];

  return allCategories.map((cat) => {
    const data = categoryMap[cat];
    if (!data || data.count === 0) {
      return {
        category: cat,
        totalAttempts: 0,
        avgScore: 0,
        passedCount: 0,
        status: "unattempted",
      };
    }

    const avgScore = Math.round(data.totalScore / data.count);
    let status: "mastered" | "good" | "weak" = "weak";
    if (avgScore >= 80) status = "mastered";
    else if (avgScore >= 60) status = "good";

    return {
      category: cat,
      totalAttempts: data.count,
      avgScore,
      passedCount: data.passed,
      status,
    };
  });
}

export interface WeakSectionItem {
  law: string;
  section: string;
  attemptsCount: number;
  failedCount: number;
  accuracyPercent: number;
  lastTestedAt: string;
}

export function getWeaknessAnalytics(): WeakSectionItem[] {
  const attempts = getExamAttempts();
  const sectionMap: Record<string, { law: string; section: string; total: number; failed: number; lastDate: string }> = {};

  attempts.forEach((a) => {
    if (a.relatedSections && a.relatedSections.length > 0) {
      const isFailed = a.scorePercent < 80;
      a.relatedSections.forEach((s) => {
        const key = `${s.law || "กม."}_${s.section}`;
        if (!sectionMap[key]) {
          sectionMap[key] = {
            law: s.law || "ตัวบทกฎหมาย",
            section: s.section,
            total: 0,
            failed: 0,
            lastDate: a.completedAt,
          };
        }
        sectionMap[key].total += 1;
        if (isFailed) sectionMap[key].failed += 1;
        if (new Date(a.completedAt).getTime() > new Date(sectionMap[key].lastDate).getTime()) {
          sectionMap[key].lastDate = a.completedAt;
        }
      });
    }
  });

  return Object.values(sectionMap)
    .map((item) => ({
      law: item.law,
      section: item.section,
      attemptsCount: item.total,
      failedCount: item.failed,
      accuracyPercent: Math.round(((item.total - item.failed) / item.total) * 100),
      lastTestedAt: item.lastDate,
    }))
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent || b.failedCount - a.failedCount);
}

export function getPacingAnalytics() {
  const attempts = getExamAttempts();
  if (attempts.length === 0) {
    return {
      avgSecondsPerQuestion: 0,
      optimalCount: 0,
      overtimeCount: 0,
      fastCount: 0,
      standardSeconds: 1440, // 24 minutes
    };
  }

  const standardSeconds = 1440;
  let totalSec = 0;
  let optimalCount = 0;
  let overtimeCount = 0;
  let fastCount = 0;

  attempts.forEach((a) => {
    const sec = a.timeSpentSeconds || 0;
    totalSec += sec;
    if (sec > standardSeconds) {
      overtimeCount += 1;
    } else if (sec >= 900) {
      // 15 to 24 mins
      optimalCount += 1;
    } else {
      fastCount += 1;
    }
  });

  return {
    avgSecondsPerQuestion: Math.round(totalSec / attempts.length),
    optimalCount,
    overtimeCount,
    fastCount,
    standardSeconds,
  };
}

export function getReadinessScore(totalBankQuestions = 10): number {
  const attempts = getExamAttempts();
  const reviewItems = getReviewItems();
  if (attempts.length === 0) return 0;

  const uniqueDone = new Set(attempts.map((a) => a.questionId)).size;
  const coverageRatio = Math.min(1, uniqueDone / Math.max(1, totalBankQuestions));
  const avgScoreRatio = Math.min(1, (attempts.reduce((sum, a) => sum + a.scorePercent, 0) / attempts.length) / 100);
  const masteredRatio = Math.min(1, reviewItems.filter((i) => i.srsBox >= 5).length / Math.max(1, uniqueDone));

  // Weighted score: 40% coverage, 40% average accuracy, 20% mastered depth
  const readiness = Math.round((coverageRatio * 0.4 + avgScoreRatio * 0.4 + masteredRatio * 0.2) * 100);
  return Math.min(100, Math.max(0, readiness));
}

