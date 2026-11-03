import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeContent = searchParams.get('includeContent') === 'true';
    const noCache = searchParams.get('nocache') === 'true' || searchParams.has('_t');

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
        createdAt: true,
        updatedAt: true,
        content: includeContent,
      }
    });

    let cacheHeader = 'no-cache, no-store, must-revalidate';
    if (includeContent && !noCache) {
      cacheHeader = 'public, max-age=60, stale-while-revalidate=300';
    }

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
