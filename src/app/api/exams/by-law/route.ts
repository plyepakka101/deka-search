import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section')?.trim();
    const bookId = searchParams.get('bookId')?.trim();
    const lawName = searchParams.get('lawName')?.trim();

    if (!section) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุเลขมาตรา (section)' }, { status: 400 });
    }

    // Clean section: e.g. "420", "90/12"
    const cleanSection = section.replace(/^มาตรา\s*/, '').trim();

    // Query questions containing this section number
    const questions = await prisma.examQuestion.findMany({
      where: {
        OR: [
          { relatedSections: { contains: `"section":"${cleanSection}"` } },
          { relatedSections: { contains: `มาตรา ${cleanSection}` } },
          { relatedSections: { contains: cleanSection } }
        ]
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
      ],
      take: 20
    });

    // Parse JSON metadata for frontend consumption
    const formatted = questions.map(q => {
      let keyIssues: string[] = [];
      let relatedDekas: string[] = [];
      let relatedSections: any[] = [];
      try { keyIssues = JSON.parse(q.keyIssues || '[]'); } catch (e) {}
      try { relatedDekas = JSON.parse(q.relatedDekas || '[]'); } catch (e) {}
      try { relatedSections = JSON.parse(q.relatedSections || '[]'); } catch (e) {}

      return {
        id: q.id,
        questionNumber: q.questionNumber,
        title: q.title,
        category: q.category,
        examYear: q.examYear,
        factsPreview: q.facts ? q.facts.substring(0, 160) + '...' : '',
        prompt: q.prompt,
        collectionTitle: q.collection?.title || '',
        collectionSource: q.collection?.source || '',
        keyIssuesCount: keyIssues.length,
        relatedDekasCount: relatedDekas.length,
        relatedDekas,
        relatedSections
      };
    });

    return NextResponse.json({
      success: true,
      section: cleanSection,
      count: formatted.length,
      questions: formatted
    });
  } catch (error: any) {
    console.error('Error fetching exams by law section:', error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อสอบ' }, { status: 500 });
  }
}
