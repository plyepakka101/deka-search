import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const abbreviation = formData.get('abbreviation') as string | null;
    const color = formData.get('color') as string | null;
    const description = formData.get('description') as string | null;
    const sourceUrl = formData.get('sourceUrl') as string | null;

    if (!file || !name || !abbreviation || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const newBook = await prisma.lawBook.create({
      data: {
        name,
        abbreviation,
        content,
        color,
        description: description || null,
        sourceUrl: sourceUrl || null,
        lastUpdated: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      }
    });

    return NextResponse.json({ success: true, book: newBook });
  } catch (error) {
    console.error('Failed to import law:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
