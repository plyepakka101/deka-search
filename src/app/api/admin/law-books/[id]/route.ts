import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { sourceUrl } = await request.json();
    const updatedBook = await prisma.lawBook.update({
      where: { id: params.id },
      data: { sourceUrl },
    });
    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error('Error updating law book:', error);
    return NextResponse.json({ error: 'Failed to update law book' }, { status: 500 });
  }
}
