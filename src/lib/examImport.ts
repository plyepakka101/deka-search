import { prisma } from '@/lib/prisma';
import { compareQuestionNumbers, detectExamCategories, examFingerprint } from '@/utils/examParser';

/** ลายนิ้วมือของข้อสอบที่มีอยู่แล้วในแต่ละหมวด (ใช้ตรวจข้อซ้ำ แยกตามหมวด) */
export async function loadExistingFingerprints(categories: string[]): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  for (const cat of categories) result.set(cat, new Set<string>());
  if (categories.length === 0) return result;

  const rows = await prisma.examQuestion.findMany({
    where: { category: { in: categories } },
    select: { category: true, facts: true, prompt: true },
  });
  for (const r of rows) {
    result.get(r.category)?.add(examFingerprint(r.facts, r.prompt));
  }
  return result;
}

/** เลขข้อถัดไปของแต่ละหมวด = เลขจำนวนเต็มสูงสุดที่มีอยู่ + 1 (เลขแบบ 7.1 ที่ยังไม่ได้เรียงใหม่ไม่นับ) */
export async function loadNextQuestionNumbers(categories: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const cat of categories) result.set(cat, 1);
  if (categories.length === 0) return result;

  const rows = await prisma.examQuestion.findMany({
    where: { category: { in: categories } },
    select: { category: true, questionNumber: true },
  });
  for (const r of rows) {
    if (!/^\d+$/.test(r.questionNumber)) continue;
    const n = parseInt(r.questionNumber, 10);
    if (n + 1 > (result.get(r.category) ?? 1)) result.set(r.category, n + 1);
  }
  return result;
}

/**
 * เรียงเลขข้อของหมวดใหม่เป็น 1, 2, 3 ... ตามลำดับการนำเข้า
 * (ชุดข้อสอบที่นำเข้าก่อนมาก่อน แล้วเรียงตามเลขข้อเดิมในไฟล์ เช่น 7.1, 7.2, 7.10)
 * คืนจำนวนข้อที่เลขเปลี่ยน
 */
export async function renumberCategory(category: string): Promise<{ total: number; changed: number }> {
  interface RenumberRow {
    id: string;
    questionNumber: string;
    createdAt: Date;
    collection: { createdAt: Date };
  }
  const rows: RenumberRow[] = await prisma.examQuestion.findMany({
    where: { category },
    select: {
      id: true,
      questionNumber: true,
      createdAt: true,
      collection: { select: { createdAt: true } },
    },
  });

  rows.sort((a, b) => {
    const byCollection = a.collection.createdAt.getTime() - b.collection.createdAt.getTime();
    if (byCollection !== 0) return byCollection;
    const byNumber = compareQuestionNumbers(a.questionNumber, b.questionNumber);
    if (byNumber !== 0) return byNumber;
    const byCreated = a.createdAt.getTime() - b.createdAt.getTime();
    return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
  });

  const updates = rows
    .map((r, idx) => ({ id: r.id, from: r.questionNumber, to: String(idx + 1) }))
    .filter((u) => u.from !== u.to);

  const CHUNK = 100;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await prisma.$transaction(
      updates
        .slice(i, i + CHUNK)
        .map((u) => prisma.examQuestion.update({ where: { id: u.id }, data: { questionNumber: u.to } }))
    );
  }

  return { total: rows.length, changed: updates.length };
}

export interface PlannedTarget {
  category: string;
  /** true = มีข้อสอบเดียวกันในหมวดนี้แล้ว (หรือซ้ำกันเองในไฟล์) จะไม่นำเข้า */
  duplicate: boolean;
}

/**
 * วางแผนการนำเข้า: ข้อสอบแต่ละข้อจะลงหมวดไหนบ้าง และหมวดนั้นซ้ำหรือไม่
 * - autoCategorize: ตรวจจากกฎหมายที่อ้าง ถ้าอ้างหลายฉบับนำเข้าทุกหมวด ถ้าไม่พบเลยลงหมวด "อื่นๆ"
 * - ไม่เปิด autoCategorize: ลงหมวด `category` ที่เลือกเพียงหมวดเดียว
 */
export async function planExamImport(
  questions: { facts: string; prompt: string; officialAnswer: string }[],
  opts: { autoCategorize: boolean; category: string; categories: string[] }
): Promise<PlannedTarget[][]> {
  const targetsPerQuestion = questions.map((q) =>
    opts.autoCategorize
      ? detectExamCategories(`${q.facts}\n${q.prompt}\n${q.officialAnswer ?? ''}`, opts.categories)
      : [opts.category]
  );

  const involved = Array.from(new Set(targetsPerQuestion.flat()));
  const seen = await loadExistingFingerprints(involved);

  return questions.map((q, i) => {
    const fp = examFingerprint(q.facts, q.prompt);
    return targetsPerQuestion[i].map((category) => {
      const set = seen.get(category) as Set<string>;
      const duplicate = set.has(fp);
      if (!duplicate) set.add(fp);
      return { category, duplicate };
    });
  });
}
