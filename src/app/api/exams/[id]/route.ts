import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getExamCategories, normalizeCategoryName } from '@/lib/examCategories';

async function requireAdmin() {
  const session = await auth();
  return !!session?.user?.isAdmin;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await prisma.examQuestion.findUnique({
      where: { id },
      include: { collection: true }
    });
    if (!question) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบที่ต้องการ' }, { status: 404 });
    }

    const relatedDekas: string[] = JSON.parse(question.relatedDekas || '[]');
    const relatedSections = JSON.parse(question.relatedSections || '[]');
    const keyIssues = JSON.parse(question.keyIssues || '[]');

    let matchedDecisions: any[] = [];
    if (relatedDekas.length > 0) {
      matchedDecisions = await prisma.decision.findMany({
        where: { decisionNumber: { in: relatedDekas } },
        select: {
          id: true, decisionNumber: true, decisionYear: true, parties: true,
          court: true, judge: true, law: true, shortSummary: true, longSummary: true
        }
      });
    }

    const dekaMap = new Map(matchedDecisions.map(d => [d.decisionNumber, d]));
    const dekaDetails = relatedDekas.map(dNum => ({
      number: dNum,
      matched: dekaMap.has(dNum),
      decision: dekaMap.get(dNum) || null
    }));

    return NextResponse.json({
      success: true,
      question: { ...question, keyIssues, relatedSections, relatedDekas, dekaDetails }
    });
  } catch (error: any) {
    console.error('Error fetching exam question detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์ดำเนินการ เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const category = normalizeCategoryName(body?.category);
    if (!category) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกหมวดข้อสอบ' }, { status: 400 });
    }

    const categories = await getExamCategories();
    if (!categories.some(item => item.name === category)) {
      return NextResponse.json({ success: false, error: 'ไม่พบหมวดข้อสอบที่เลือก' }, { status: 400 });
    }

    const existing = await prisma.examQuestion.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อสอบที่ต้องการ' }, { status: 404 });
    }

    const updated = await prisma.examQuestion.update({
      where: { id },
      data: { category },
      select: { id: true, category: true, updatedAt: true }
    });
    return NextResponse.json({ success: true, category: updated.category, updatedAt: updated.updatedAt });
  } catch (error: any) {
    console.error('Error moving exam question category:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถย้ายหมวดข้อสอบได้' }, { status: 500 });
  }
}
