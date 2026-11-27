import { prisma } from '@/lib/prisma';
import { DEFAULT_EXAM_CATEGORIES } from '@/utils/examParser';

export interface ExamCategoryInfo {
  name: string;
  builtin: boolean;
  /** id ของแถวในตาราง ExamCategoryDef (เฉพาะหมวดที่แอดมินเพิ่มเอง) */
  id?: string;
  /** จำนวนข้อสอบในหมวดนี้ */
  questionCount?: number;
}

export const MAX_CATEGORY_NAME_LENGTH = 200;

let tableEnsured = false;

/** สร้างตาราง ExamCategoryDef อัตโนมัติถ้ายังไม่มี (ฐานข้อมูล Turso ไม่ต้องรัน migration เอง) */
async function ensureTable() {
  if (tableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExamCategoryDef" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ExamCategoryDef_name_key" ON "ExamCategoryDef"("name")`
  );
  tableEnsured = true;
}

export function normalizeCategoryName(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * รายการหมวดทั้งหมด = หมวดตั้งต้น + หมวดที่แอดมินเพิ่ม (+ หมวดเก่าที่มีข้อสอบอยู่แต่ไม่อยู่ในรายการ)
 * ถ้าอ่านฐานข้อมูลไม่ได้ จะคืนเฉพาะหมวดตั้งต้นเพื่อไม่ให้หน้าเว็บพัง
 */
export async function getExamCategories(): Promise<ExamCategoryInfo[]> {
  const result: ExamCategoryInfo[] = DEFAULT_EXAM_CATEGORIES.map((name) => ({ name, builtin: true }));
  const seen = new Set<string>(DEFAULT_EXAM_CATEGORIES);

  try {
    await ensureTable();
    const custom = await prisma.examCategoryDef.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    for (const c of custom) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      result.push({ name: c.name, builtin: false, id: c.id });
    }

    const grouped = await prisma.examQuestion.groupBy({
      by: ['category'],
      _count: { id: true },
    });
    const counts = new Map<string, number>();
    for (const g of grouped) counts.set(g.category, g._count.id);
    for (const g of grouped) {
      if (!seen.has(g.category)) {
        seen.add(g.category);
        result.push({ name: g.category, builtin: false });
      }
    }
    for (const item of result) item.questionCount = counts.get(item.name) ?? 0;
  } catch (error) {
    console.error('getExamCategories: falling back to built-in categories', error);
  }

  return result;
}

export async function addExamCategory(name: string) {
  await ensureTable();
  const existing = await getExamCategories();
  if (existing.some((c) => c.name === name)) {
    throw new Error('DUPLICATE');
  }
  const last = await prisma.examCategoryDef.findFirst({ orderBy: { sortOrder: 'desc' } });
  return prisma.examCategoryDef.create({
    data: {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
}

export async function deleteExamCategory(id: string) {
  await ensureTable();
  const cat = await prisma.examCategoryDef.findUnique({ where: { id } });
  if (!cat) throw new Error('NOT_FOUND');
  const used = await prisma.examQuestion.count({ where: { category: cat.name } });
  if (used > 0) {
    throw new Error('IN_USE');
  }
  await prisma.examCategoryDef.delete({ where: { id } });
  return cat;
}
