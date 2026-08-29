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

    return NextResponse.json(books);
  } catch (error) {
    console.error('Failed to fetch law books:', error);
    return NextResponse.json({ error: 'Failed to fetch law books' }, { status: 500 });
  }
}
