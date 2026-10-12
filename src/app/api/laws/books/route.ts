import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeContent = searchParams.get('includeContent') === 'true';

    const books = await prisma.lawBook.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        description: true,
        sourceUrl: true,
        lastUpdated: true,
        content: includeContent,
      }
    });

    const cacheHeader = includeContent
      ? 'public, max-age=600, stale-while-revalidate=86400'
      : 'public, max-age=1800, stale-while-revalidate=86400';

    return NextResponse.json(books, {
      headers: {
        'Cache-Control': cacheHeader,
      },
    });
  } catch (error) {
    console.error('Failed to fetch law books:', error);
    return NextResponse.json({ error: 'Failed to fetch law books' }, { status: 500 });
  }
}
