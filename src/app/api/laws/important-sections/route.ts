import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { compareSectionNumbers } from '@/utils/sectionSort';

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);

    const sections = await prisma.adminImportantSection.findMany();

    const formatted = sections.map((s: any) => ({
      id: s.id,
      bookId: s.bookId,
      sectionNumber: s.sectionNumber,
      title: s.title,
      note: s.note,
      isHighlighted: s.isHighlighted,
      linkedDekaIds: s.linkedDekaIds ? safeJsonParse(s.linkedDekaIds, []) : [],
      textHighlights: s.textHighlights ? safeJsonParse(s.textHighlights, []) : [],
      updatedAt: s.updatedAt,
    }));

    const sorted = formatted.sort((a: any, b: any) => {
      return compareSectionNumbers(a.sectionNumber, b.sectionNumber);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      sections: sorted,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
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

function safeJsonParse(val: string, fallback: any) {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    const body = await request.json();
    const { sectionId, bookId, sectionNumber, title, note, isHighlighted, linkedDekaIds, textHighlights, action, sections: bulkSections } = body;

    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        savedToDb: false,
        message: 'ผู้ใช้ทั่วไป: บันทึกข้อมูลในอุปกรณ์นี้เรียบร้อย (ย้ายเครื่องได้ผ่านการส่งออกข้อมูล)',
      });
    }

    // Bulk sync for initial/offline data
    if (action === 'bulk_sync' && Array.isArray(bulkSections)) {
      for (const item of bulkSections) {
        if (!item.sectionId && !item.id) continue;
        const targetId = item.sectionId || item.id;
        const dekaStr = Array.isArray(item.linkedDekaIds) ? JSON.stringify(item.linkedDekaIds) : (typeof item.linkedDekaIds === 'string' ? item.linkedDekaIds : null);
        const hlStr = Array.isArray(item.textHighlights) ? JSON.stringify(item.textHighlights) : (typeof item.textHighlights === 'string' ? item.textHighlights : null);

        await prisma.adminImportantSection.upsert({
          where: { id: targetId },
          update: {
            bookId: item.bookId || null,
            sectionNumber: String(item.sectionNumber || ''),
            title: item.title || null,
            note: item.note || item.text || null,
            isHighlighted: Boolean(item.isHighlighted),
            linkedDekaIds: dekaStr,
            textHighlights: hlStr,
            updatedAt: new Date(),
          },
          create: {
            id: targetId,
            bookId: item.bookId || null,
            sectionNumber: String(item.sectionNumber || ''),
            title: item.title || null,
            note: item.note || item.text || null,
            isHighlighted: Boolean(item.isHighlighted),
            linkedDekaIds: dekaStr,
            textHighlights: hlStr,
          }
        });
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ซิงค์ข้อมูลมาตราทั้งหมดลงฐานข้อมูลเรียบร้อย',
      });
    }

    const hasHighlight = Boolean(isHighlighted);
    const hasNote = Boolean(note && String(note).trim().length > 0);
    const hasDekas = Array.isArray(linkedDekaIds) && linkedDekaIds.length > 0;
    const hasHighlights = Array.isArray(textHighlights) && textHighlights.length > 0;

    // Delete only when nothing remains
    if (action === 'delete' || (!hasHighlight && !hasNote && !hasDekas && !hasHighlights)) {
      if (sectionId) {
        await prisma.adminImportantSection.deleteMany({
          where: { id: sectionId },
        });
      }
      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ลบข้อมูลมาตราออกจากฐานข้อมูลเรียบร้อย',
      });
    }

    const dekaStr = Array.isArray(linkedDekaIds) ? JSON.stringify(linkedDekaIds) : (typeof linkedDekaIds === 'string' ? linkedDekaIds : null);
    const hlStr = Array.isArray(textHighlights) ? JSON.stringify(textHighlights) : (typeof textHighlights === 'string' ? textHighlights : null);

    // Upsert
    const saved = await prisma.adminImportantSection.upsert({
      where: { id: sectionId },
      update: {
        bookId: bookId || null,
        sectionNumber: String(sectionNumber || ''),
        title: title || null,
        note: note ? String(note) : null,
        isHighlighted: hasHighlight,
        linkedDekaIds: dekaStr,
        textHighlights: hlStr,
        updatedAt: new Date(),
      },
      create: {
        id: sectionId,
        bookId: bookId || null,
        sectionNumber: String(sectionNumber || ''),
        title: title || null,
        note: note ? String(note) : null,
        isHighlighted: hasHighlight,
        linkedDekaIds: dekaStr,
        textHighlights: hlStr,
      }
    });

    return NextResponse.json({
      success: true,
      savedToDb: true,
      section: saved,
      message: 'แอดมิน: บันทึกข้อมูลมาตราลงฐานข้อมูลเรียบร้อย (ซิงค์ใช้งานได้ทุกเครื่อง)',
    });
  } catch (error: any) {
    console.error('Failed to update important section:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
