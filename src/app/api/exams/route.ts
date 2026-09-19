import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EXAM_CATEGORIES } from '@/utils/examParser';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const year = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (year) {
      whereClause.examYear = parseInt(year, 10);
    }

    if (q && q.trim()) {
      const term = q.trim();
      whereClause.OR = [
        { facts: { contains: term } },
        { prompt: { contains: term } },
        { title: { contains: term } },
        { officialAnswer: { contains: term } },
        { questionNumber: { contains: term } },
      ];
    }

    // Run query in parallel: total count and items
    const [total, questions, categoryCounts] = await Promise.all([
      prisma.examQuestion.count({ where: whereClause }),
      prisma.examQuestion.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { examYear: 'desc' },
          { questionNumber: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          collection: {
            select: {
              id: true,
              title: true,
              source: true
            }
          }
        }
      }),
      // Aggregate counts for each of the 9 categories
      prisma.examQuestion.groupBy({
        by: ['category'],
        _count: {
          id: true
        }
      })
    ]);

    // Build category count dictionary
    const categoryStats: Record<string, number> = {};
    EXAM_CATEGORIES.forEach(cat => {
      categoryStats[cat] = 0;
    });
    categoryCounts.forEach(c => {
      categoryStats[c.category] = c._count.id;
    });

    const totalAllCategories = Object.values(categoryStats).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      questions: questions.map(q => ({
        ...q,
        keyIssues: JSON.parse(q.keyIssues || '[]'),
        relatedSections: JSON.parse(q.relatedSections || '[]'),
        relatedDekas: JSON.parse(q.relatedDekas || '[]'),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      categoryStats,
      totalAllCategories
    });
  } catch (error: any) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
