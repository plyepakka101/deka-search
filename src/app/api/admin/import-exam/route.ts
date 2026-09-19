import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseExamText, ParsedExamQuestion } from '@/utils/examParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, rawText, category, title, year, description, source, questions } = body;

    // 1. ACTION: PREVIEW
    if (action === 'preview') {
      if (!rawText || !rawText.trim()) {
        return NextResponse.json({ error: 'กรุณากรอกหรืออัปโหลดข้อความข้อสอบ' }, { status: 400 });
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

      // Attach matched details to each question
      const enhancedQuestions = parsed.questions.map(q => ({
        ...q,
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
          matchedDekasCount: matchedDecisions.length,
          questions: enhancedQuestions
        }
      });
    }

    // 2. ACTION: SAVE
    if (action === 'save') {
      if (!title || !category || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'ข้อมูลชุดข้อสอบไม่ครบถ้วน' }, { status: 400 });
      }

      const newCollection = await prisma.examCollection.create({
        data: {
          title,
          category,
          year: year ? parseInt(year, 10) : null,
          description: description || null,
          source: source || 'เนติบัณฑิตยสภา',
          questions: {
            create: questions.map((q: ParsedExamQuestion) => ({
              questionNumber: q.questionNumber,
              title: q.title || null,
              facts: q.facts,
              prompt: q.prompt,
              officialAnswer: q.officialAnswer,
              examDate: q.examDate || null,
              examYear: q.examYear || (year ? parseInt(year, 10) : null),
              category: q.category || category,
              keyIssues: JSON.stringify(q.keyIssues || []),
              relatedSections: JSON.stringify(q.relatedSections || []),
              relatedDekas: JSON.stringify(q.relatedDekas || []),
            }))
          }
        },
        include: {
          questions: true
        }
      });

      return NextResponse.json({
        success: true,
        collection: newCollection
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in import-exam API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
