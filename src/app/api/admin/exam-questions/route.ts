import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getExamCategories } from '@/lib/examCategories';
import { loadExistingFingerprints, loadNextQuestionNumbers } from '@/lib/examImport';
import { examFingerprint } from '@/utils/examParser';

const LIST_LIMIT = 200;

async function requireAdmin() {
  const session = await auth();
  return !!session?.user?.isAdmin;
}

/** รายการข้อสอบในหมวดหนึ่ง (ใช้ตรวจ/ย้ายข้อสอบในหมวด "อื่นๆ") */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const category = new URL(request.url).searchParams.get('category');
  if (!category) {
    return NextResponse.json({ error: 'กรุณาระบุหมวด' }, { status: 400 });
  }

  const [total, rows] = await Promise.all([
    prisma.examQuestion.count({ where: { category } }),
    prisma.examQuestion.findMany({
      where: { category },
      take: LIST_LIMIT,
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        questionNumber: true,
        title: true,
        facts: true,
        prompt: true,
        examYear: true,
        collection: { select: { title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    total,
    questions: rows.map((r) => ({
      id: r.id,
      questionNumber: r.questionNumber,
      title: r.title,
      factsPreview: r.facts.length > 200 ? r.facts.substring(0, 200) + '...' : r.facts,
      prompt: r.prompt,
      examYear: r.examYear,
      collectionTitle: r.collection?.title || '',
    })),
  });
}

/** ย้ายข้อสอบไปหมวดอื่น: ได้เลขข้อต่อท้ายหมวดปลายทาง และไม่ย้ายถ้าหมวดปลายทางมีข้อเดียวกันอยู่แล้ว */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const target = typeof body?.category === 'string' ? body.category : '';
    if (!id || !target) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const categoryNames = (await getExamCategories()).map((c) => c.name);
    if (!categoryNames.includes(target)) {
      return NextResponse.json({ error: 'ไม่พบหมวดปลายทาง' }, { status: 400 });
    }

    const question = await prisma.examQuestion.findUnique({ where: { id } });
    if (!question) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 });
    }
    if (question.category === target) {
      return NextResponse.json({ success: true, moved: false, category: question.category, questionNumber: question.questionNumber });
    }

    const existing = await loadExistingFingerprints([target]);
    if (existing.get(target)?.has(examFingerprint(question.facts, question.prompt))) {
      return NextResponse.json(
        { error: 'หมวดปลายทางมีข้อสอบข้อนี้อยู่แล้ว (ซ้ำ) จึงไม่ย้าย — ลบข้อนี้ทิ้งแทนได้' },
        { status: 409 }
      );
    }

    const next = await loadNextQuestionNumbers([target]);
    const newNumber = String(next.get(target) ?? 1);
    await prisma.examQuestion.update({
      where: { id },
      data: { category: target, questionNumber: newNumber },
    });

    return NextResponse.json({ success: true, moved: true, category: target, questionNumber: newNumber });
  } catch (error) {
    console.error('Error moving exam question:', error);
    return NextResponse.json({ error: 'ไม่สามารถย้ายข้อสอบได้' }, { status: 500 });
  }
}

/** ลบข้อสอบข้อเดียว (เช่น ข้อที่ซ้ำกับหมวดปลายทาง) */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ไม่พบรหัสข้อสอบ' }, { status: 400 });
  }
  try {
    await prisma.examQuestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 });
  }
}
