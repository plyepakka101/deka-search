import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { thaiToArabic } from '@/components/law-mate/utils/textUtils';
import { parseLaws as parseLawsContent } from '@/components/law-mate/services/lawParser';

const cache = new Map<string, any[]>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const section = searchParams.get('s');

  if (!bookId || !section) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  let parsedLaws = cache.get(bookId);
  
  if (!parsedLaws) {
    const book = await prisma.lawBook.findUnique({ where: { id: bookId } });
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    parsedLaws = parseLawsContent(book.content, book.id, book.name);
    cache.set(bookId, parsedLaws);
  }

  const searchNum = thaiToArabic(section).replace(/\s+/g, '').toLowerCase();
  
  const law = parsedLaws.find(l => {
    const lNum = thaiToArabic(l.sectionNumber).replace(/\s+/g, '').toLowerCase();
    return lNum === searchNum;
  });
  
  if (!law) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ content: law.content });
}
