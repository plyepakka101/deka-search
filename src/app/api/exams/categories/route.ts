import { NextResponse } from 'next/server';
import { getExamCategories } from '@/lib/examCategories';

export async function GET() {
  const categories = await getExamCategories();
  return NextResponse.json(
    { success: true, categories },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  );
}
