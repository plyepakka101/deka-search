import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const question = await prisma.examQuestion.findUnique({
      where: { id },
      include: {
        collection: true
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบที่ต้องการ' }, { status: 404 });
    }

    const relatedDekas: string[] = JSON.parse(question.relatedDekas || '[]');
    const relatedSections = JSON.parse(question.relatedSections || '[]');
    const keyIssues = JSON.parse(question.keyIssues || '[]');

    // Fetch matched Deka decisions from Turso if any
    let matchedDecisions: any[] = [];
    if (relatedDekas.length > 0) {
      matchedDecisions = await prisma.decision.findMany({
        where: {
          decisionNumber: { in: relatedDekas }
        },
        select: {
          id: true,
          decisionNumber: true,
          decisionYear: true,
          parties: true,
          court: true,
          judge: true,
          law: true,
          shortSummary: true,
          longSummary: true
        }
      });
    }

    // Build lookup map
    const dekaMap = new Map(matchedDecisions.map(d => [d.decisionNumber, d]));

    const dekaDetails = relatedDekas.map(dNum => ({
      number: dNum,
      matched: dekaMap.has(dNum),
      decision: dekaMap.get(dNum) || null
    }));

    return NextResponse.json({
      success: true,
      question: {
        ...question,
        keyIssues,
        relatedSections,
        relatedDekas,
        dekaDetails
      }
    });
  } catch (error: any) {
    console.error('Error fetching exam question detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
