import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const MAX_LAW_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const abbreviation = formData.get('abbreviation') as string | null;
    const color = formData.get('color') as string | null;
    const description = formData.get('description') as string | null;
    const sourceUrl = formData.get('sourceUrl') as string | null;

    if (!file || !name || !abbreviation || !color) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' }, { status: 400 });
    }

    // Input length limits
    if (name.length > 255) {
      return NextResponse.json({ error: 'ชื่อประมวล/พรบ. ยาวเกินไป (ไม่เกิน 255 ตัวอักษร)' }, { status: 400 });
    }
    if (abbreviation.length > 50) {
      return NextResponse.json({ error: 'ชื่อย่อกฎหมายยาวเกินไป (ไม่เกิน 50 ตัวอักษร)' }, { status: 400 });
    }
    if (color.length > 50) {
      return NextResponse.json({ error: 'รหัสสียาวเกินไป' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'คำอธิบายยาวเกินไป (ไม่เกิน 2,000 ตัวอักษร)' }, { status: 400 });
    }
    if (sourceUrl && sourceUrl.length > 2000) {
      return NextResponse.json({ error: 'ลิงก์ที่มายาวเกินไป (ไม่เกิน 2,000 ตัวอักษร)' }, { status: 400 });
    }

    // File size validation to prevent OOM
    if (file.size > MAX_LAW_FILE_SIZE) {
      return NextResponse.json({ error: 'ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 10MB)' }, { status: 413 });
    }

    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json({ error: 'ไฟล์ที่อัปโหลดว่างเปล่า' }, { status: 400 });
    }

    const newBook = await prisma.lawBook.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation.trim(),
        content,
        color: color.trim(),
        description: description ? description.trim() : null,
        sourceUrl: sourceUrl ? sourceUrl.trim() : null,
        lastUpdated: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      }
    });

    revalidatePath('/api/laws/books');
    revalidatePath('/laws');
    revalidatePath('/search/law');

    return NextResponse.json({ success: true, book: newBook });
  } catch (error) {
    console.error('Failed to import law:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
