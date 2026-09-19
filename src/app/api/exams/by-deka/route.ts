import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const decisionNumber = searchParams.get('number')?.trim();

    if (!decisionNumber) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุเลขฎีกา (number)' }, { status: 400 });
    }

    const questions = await prisma.examQuestion.findMany({
      where: {
        relatedDekas: {
          contains: decisionNumber
        }
      },
      include: {
        collection: {
          select: {
            title: true,
            source: true,
            year: true
          }
        }
      },
      orderBy: [
        { examYear: 'desc' },
        { questionNumber: 'asc' }
      ]
    });

    const formatted = questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      title: q.title,
      category: q.category,
      examYear: q.examYear,
      factsPreview: q.facts ? q.facts.substring(0, 160) + '...' : '',
      collectionTitle: q.collection?.title || '',
      collectionSource: q.collection?.source || ''
    }));

    return NextResponse.json({
      success: true,
      decisionNumber,
      count: formatted.length,
      questions: formatted
    });
  } catch (error: any) {
    console.error('Error fetching exams by deka number:', error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อสอบ' }, { status: 500 });
  }
}
