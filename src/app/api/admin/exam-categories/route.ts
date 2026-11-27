import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  addExamCategory,
  deleteExamCategory,
  getExamCategories,
  normalizeCategoryName,
  MAX_CATEGORY_NAME_LENGTH,
} from '@/lib/examCategories';

async function requireAdmin() {
  const session = await auth();
  return !!session?.user?.isAdmin;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, categories: await getExamCategories() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const name = normalizeCategoryName(body?.name);
    if (!name) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหมวด' }, { status: 400 });
    }
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
      return NextResponse.json({ error: `ชื่อหมวดยาวเกินไป (ไม่เกิน ${MAX_CATEGORY_NAME_LENGTH} ตัวอักษร)` }, { status: 400 });
    }
    const created = await addExamCategory(name);
    return NextResponse.json({ success: true, category: { id: created.id, name: created.name, builtin: false } });
  } catch (error: any) {
    if (error?.message === 'DUPLICATE') {
      return NextResponse.json({ error: 'มีหมวดนี้อยู่แล้ว' }, { status: 409 });
    }
    console.error('Error adding exam category:', error);
    return NextResponse.json({ error: 'ไม่สามารถเพิ่มหมวดได้' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ไม่พบรหัสหมวด' }, { status: 400 });
    }
    await deleteExamCategory(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'ไม่พบหมวดนี้ (หมวดตั้งต้นลบไม่ได้)' }, { status: 404 });
    }
    if (error?.message === 'IN_USE') {
      return NextResponse.json({ error: 'ลบไม่ได้ เพราะยังมีข้อสอบหรือชุดข้อสอบอยู่ในหมวดนี้' }, { status: 409 });
    }
    console.error('Error deleting exam category:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบหมวดได้' }, { status: 500 });
  }
}
