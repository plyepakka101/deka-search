import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renumberCategory } from '@/lib/examImport';

async function requireAdmin() {
  const session = await auth();
  return !!session?.user?.isAdmin;
}

/** ประวัติการนำเข้า: ชุดข้อสอบล่าสุด พร้อมจำนวนข้อแยกตามหมวด */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const collections = await prisma.examCollection.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, title: true, source: true, year: true, createdAt: true },
  });

  const collectionIds: string[] = [];
  for (const c of collections) collectionIds.push(c.id);

  const grouped = await prisma.examQuestion.groupBy({
    by: ['collectionId', 'category'],
    where: { collectionId: { in: collectionIds } },
    _count: { id: true },
  });

  const perCollection = new Map<string, { category: string; count: number }[]>();
  for (const g of grouped) {
    const list = perCollection.get(g.collectionId) ?? [];
    list.push({ category: g.category, count: g._count.id });
    perCollection.set(g.collectionId, list);
  }

  const result = [];
  for (const c of collections) {
    const categories = perCollection.get(c.id) ?? [];
    let total = 0;
    for (const x of categories) total += x.count;
    result.push({
      id: c.id,
      title: c.title,
      source: c.source,
      year: c.year,
      createdAt: c.createdAt.toISOString(),
      questionCount: total,
      categories,
    });
  }

  return NextResponse.json({ success: true, collections: result });
}

/** ลบทั้งชุดที่นำเข้า (ข้อสอบทุกข้อในชุดนั้น) แล้วเรียงเลขข้อของหมวดที่ได้รับผลใหม่ */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ไม่พบรหัสชุดข้อสอบ' }, { status: 400 });
  }

  try {
    const collection = await prisma.examCollection.findUnique({ where: { id }, select: { id: true } });
    if (!collection) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบ' }, { status: 404 });
    }

    const affected = await prisma.examQuestion.groupBy({
      by: ['category'],
      where: { collectionId: id },
      _count: { id: true },
    });

    // ลบข้อสอบก่อนแล้วจึงลบชุด (ไม่พึ่ง cascade ของฐานข้อมูล)
    const [deletedQuestions] = await prisma.$transaction([
      prisma.examQuestion.deleteMany({ where: { collectionId: id } }),
      prisma.examCollection.delete({ where: { id } }),
    ]);

    const renumberedCategories: string[] = [];
    for (const a of affected) {
      await renumberCategory(a.category);
      renumberedCategories.push(a.category);
    }

    return NextResponse.json({
      success: true,
      deletedQuestions: deletedQuestions.count,
      renumberedCategories,
    });
  } catch (error) {
    console.error('Error deleting exam collection:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบชุดข้อสอบได้' }, { status: 500 });
  }
}
