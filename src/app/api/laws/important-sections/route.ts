import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { compareSectionNumbers } from '@/utils/sectionSort';

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);

    const sections = await prisma.adminImportantSection.findMany();

    const sorted = sections.sort((a: any, b: any) => {
      return compareSectionNumbers(a.sectionNumber, b.sectionNumber);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      sections: sorted,
    });
  } catch (error: any) {
    console.error('Failed to fetch important sections:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch important sections',
      sections: [],
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    const body = await request.json();
    const { sectionId, bookId, sectionNumber, title, note, isHighlighted, action } = body;

    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        savedToDb: false,
        message: 'ผู้ใช้ทั่วไป: บันทึกมาตราสำคัญในอุปกรณ์นี้เรียบร้อย (ย้ายเครื่องได้ผ่านการส่งออกข้อมูล)',
      });
    }

    if (action === 'delete' || isHighlighted === false) {
      await prisma.adminImportantSection.deleteMany({
        where: { id: sectionId },
      });
      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ลบมาตราสำคัญออกจากฐานข้อมูลเรียบร้อย',
      });
    }

    // Upsert
    const saved = await prisma.adminImportantSection.upsert({
      where: { id: sectionId },
      update: {
        bookId: bookId || null,
        sectionNumber: String(sectionNumber || ''),
        title: title || null,
        note: note || null,
        isHighlighted: true,
        updatedAt: new Date(),
      },
      create: {
        id: sectionId,
        bookId: bookId || null,
        sectionNumber: String(sectionNumber || ''),
        title: title || null,
        note: note || null,
        isHighlighted: true,
      }
    });

    return NextResponse.json({
      success: true,
      savedToDb: true,
      section: saved,
      message: 'แอดมิน: บันทึกมาตราสำคัญลงฐานข้อมูลเรียบร้อย (ซิงค์ใช้งานได้ทุกเครื่อง)',
    });
  } catch (error: any) {
    console.error('Failed to update important section:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
