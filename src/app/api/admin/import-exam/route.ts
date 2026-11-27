import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseExamText, ParsedExamQuestion } from '@/utils/examParser';
import { auth } from '@/auth';
import { getExamCategories } from '@/lib/examCategories';
import { loadNextQuestionNumbers, planExamImport } from '@/lib/examImport';
import { UNCATEGORIZED_CATEGORY } from '@/utils/examParser';

const MAX_EXAM_RAW_TEXT = 5 * 1024 * 1024; // 5MB
const MAX_QUESTIONS_PER_BATCH = 200;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, rawText, category, title, year, description, source, questions } = body;
    const autoCategorize = body.autoCategorize === true;

    // 1. ACTION: PREVIEW
    if (action === 'preview') {
      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        return NextResponse.json({ error: 'กรุณากรอกหรืออัปโหลดข้อความข้อสอบ' }, { status: 400 });
      }

      if (rawText.length > MAX_EXAM_RAW_TEXT) {
        return NextResponse.json({ error: 'ข้อความข้อสอบมีขนาดยาวเกินไป (จำกัดไม่เกิน 5MB)' }, { status: 413 });
      }

      const parsed = parseExamText(rawText, category || 'พระราชบัญญัติล้มละลาย พ.ศ. 2483', title || '');

      // Collect all extracted deka numbers to check against Turso database
      const allDekaNumbers: string[] = [];
      parsed.questions.forEach(q => {
        q.relatedDekas.forEach(d => {
          if (!allDekaNumbers.includes(d)) allDekaNumbers.push(d);
        });
      });

      // Query matched decisions in DB
      let matchedDecisions: any[] = [];
      if (allDekaNumbers.length > 0) {
        matchedDecisions = await prisma.decision.findMany({
          where: {
            decisionNumber: { in: allDekaNumbers }
          },
          select: {
            id: true,
            decisionNumber: true,
            decisionYear: true,
            parties: true,
            shortSummary: true
          }
        });
      }

      const matchedMap = new Map(matchedDecisions.map(d => [d.decisionNumber, d]));

      const categoryNames = (await getExamCategories()).map(c => c.name);
      const manualCategory = category || 'พระราชบัญญัติล้มละลาย พ.ศ. 2483';
      if (!autoCategorize && !categoryNames.includes(manualCategory)) {
        return NextResponse.json({ error: 'ไม่พบหมวดที่เลือก' }, { status: 400 });
      }
      const plan = await planExamImport(parsed.questions, {
        autoCategorize,
        category: manualCategory,
        categories: categoryNames,
      });

      // Attach matched details + target categories to each question
      const enhancedQuestions = parsed.questions.map((q, qi) => ({
        ...q,
        targets: plan[qi],
        dekaDetails: q.relatedDekas.map(dNum => ({
          number: dNum,
          matched: matchedMap.has(dNum),
          decision: matchedMap.get(dNum) || null
        }))
      }));

      return NextResponse.json({
        success: true,
        collection: {
          title: parsed.title,
          category: parsed.category,
          year: parsed.year,
          description: description || null,
          source: source || 'เนติบัณฑิตยสภา',
          questionsCount: enhancedQuestions.length,
          importCount: plan.flat().filter(t => !t.duplicate).length,
          duplicateCount: plan.flat().filter(t => t.duplicate).length,
          matchedDekasCount: matchedDecisions.length,
          questions: enhancedQuestions
        }
      });
    }

    // 2. ACTION: SAVE
    if (action === 'save') {
      if (!title || !Array.isArray(questions) || questions.length === 0 || (!autoCategorize && !category)) {
        return NextResponse.json({ error: 'ข้อมูลชุดข้อสอบไม่ครบถ้วน' }, { status: 400 });
      }

      if (questions.length > MAX_QUESTIONS_PER_BATCH) {
        return NextResponse.json({ error: `จำนวนข้อสอบเกินขีดจำกัด (ไม่เกิน ${MAX_QUESTIONS_PER_BATCH} ข้อต่อชุด)` }, { status: 400 });
      }

      const malformed = (questions as ParsedExamQuestion[]).some(
        q => !q || typeof q.facts !== 'string' || typeof q.prompt !== 'string'
      );
      if (malformed) {
        return NextResponse.json({ error: 'ข้อมูลข้อสอบไม่ถูกต้อง' }, { status: 400 });
      }

      const categoryNames = (await getExamCategories()).map(c => c.name);
      if (!autoCategorize && !categoryNames.includes(category)) {
        return NextResponse.json({ error: 'ไม่พบหมวดที่เลือก' }, { status: 400 });
      }

      // จัดหมวด + ตรวจข้อซ้ำใหม่ที่ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อข้อมูลหมวดจากฝั่งผู้ใช้)
      const plan = await planExamImport(questions as ParsedExamQuestion[], {
        autoCategorize,
        category,
        categories: categoryNames,
      });

      const nextNumber = await loadNextQuestionNumbers(Array.from(new Set(plan.flat().map(t => t.category))));
      const yearNum = year ? parseInt(year, 10) : null;

      const rows: {
        questionNumber: string;
        title: string | null;
        facts: string;
        prompt: string;
        officialAnswer: string;
        examDate: string | null;
        examYear: number | null;
        category: string;
        keyIssues: string;
        relatedSections: string;
        relatedDekas: string;
      }[] = [];
      let skippedDuplicates = 0;

      (questions as ParsedExamQuestion[]).forEach((q, qi) => {
        for (const target of plan[qi]) {
          if (target.duplicate) {
            skippedDuplicates++;
            continue;
          }
          const num = nextNumber.get(target.category) ?? 1;
          nextNumber.set(target.category, num + 1);
          rows.push({
            // เลขข้อกำหนดตามลำดับการนำเข้าในแต่ละหมวด ไม่ใช้เลขข้อในไฟล์
            questionNumber: String(num),
            title: q.title || null,
            facts: q.facts,
            prompt: q.prompt,
            officialAnswer: q.officialAnswer,
            examDate: q.examDate || null,
            examYear: q.examYear || yearNum,
            category: target.category,
            keyIssues: JSON.stringify(q.keyIssues || []),
            relatedSections: JSON.stringify(q.relatedSections || []),
            relatedDekas: JSON.stringify(q.relatedDekas || []),
          });
        }
      });

      const perCategory: Record<string, number> = {};
      for (const r of rows) perCategory[r.category] = (perCategory[r.category] || 0) + 1;

      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          imported: 0,
          skippedDuplicates,
          perCategory,
          collection: null,
        });
      }

      // หมวดของชุดข้อสอบ = หมวดที่มีข้อมากที่สุดในการนำเข้าครั้งนี้
      const dominant = Object.entries(perCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || UNCATEGORIZED_CATEGORY;

      const newCollection = await prisma.examCollection.create({
        data: {
          title,
          category: dominant,
          year: yearNum,
          description: description || null,
          source: source || 'เนติบัณฑิตยสภา',
          questions: { create: rows },
        },
      });

      return NextResponse.json({
        success: true,
        imported: rows.length,
        skippedDuplicates,
        perCategory,
        collection: { id: newCollection.id, title: newCollection.title },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in import-exam API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
