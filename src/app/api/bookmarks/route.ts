import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);

    const bookmarks = await prisma.adminBookmark.findMany({
      orderBy: [
        { decisionYear: 'asc' },
        { decisionNumber: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      bookmarks,
    });
  } catch (error: any) {
    console.error('Failed to fetch bookmarks:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch bookmarks',
      bookmarks: [],
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    const body = await request.json();
    const { action, bookmark, bookmarks: bulkBookmarks } = body;

    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        savedToDb: false,
        message: 'ผู้ใช้ทั่วไป: บันทึกบุคมาร์คในอุปกรณ์นี้เรียบร้อย (ย้ายเครื่องได้ผ่านการส่งออกข้อมูล)',
      });
    }

    // Bulk sync
    if (action === 'sync_all' && Array.isArray(bulkBookmarks)) {
      for (const b of bulkBookmarks) {
        if (!b.id) continue;
        await prisma.adminBookmark.upsert({
          where: { id: b.id },
          update: {
            decisionNumber: b.decisionNumber,
            decisionYear: b.decisionYear ? Number(b.decisionYear) : null,
            parties: b.parties || null,
            shortSummary: b.shortSummary || null,
            timestamp: b.timestamp ? Number(b.timestamp) : null,
            updatedAt: new Date(),
          },
          create: {
            id: b.id,
            decisionNumber: b.decisionNumber,
            decisionYear: b.decisionYear ? Number(b.decisionYear) : null,
            parties: b.parties || null,
            shortSummary: b.shortSummary || null,
            timestamp: b.timestamp ? Number(b.timestamp) : null,
          }
        });
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ซิงค์บุคมาร์คทั้งหมดลงฐานข้อมูลเรียบร้อย',
      });
    }

    if (action === 'remove') {
      if (bookmark?.id) {
        await prisma.adminBookmark.deleteMany({
          where: { id: bookmark.id },
        });
      }
      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ลบบุคมาร์คออกจากฐานข้อมูลเรียบร้อย',
      });
    }

    if (action === 'add' || action === 'toggle') {
      if (!bookmark?.id) {
        return NextResponse.json({ success: false, error: 'Missing bookmark.id' }, { status: 400 });
      }

      const existing = await prisma.adminBookmark.findUnique({
        where: { id: bookmark.id }
      });

      if (action === 'toggle' && existing) {
        await prisma.adminBookmark.delete({
          where: { id: bookmark.id }
        });
        return NextResponse.json({
          success: true,
          savedToDb: true,
          isBookmarked: false,
          message: 'แอดมิน: ลบบุคมาร์คออกจากฐานข้อมูลเรียบร้อย',
        });
      }

      const saved = await prisma.adminBookmark.upsert({
        where: { id: bookmark.id },
        update: {
          decisionNumber: bookmark.decisionNumber,
          decisionYear: bookmark.decisionYear ? Number(bookmark.decisionYear) : null,
          parties: bookmark.parties || null,
          shortSummary: bookmark.shortSummary || null,
          timestamp: bookmark.timestamp ? Number(bookmark.timestamp) : null,
          updatedAt: new Date(),
        },
        create: {
          id: bookmark.id,
          decisionNumber: bookmark.decisionNumber,
          decisionYear: bookmark.decisionYear ? Number(bookmark.decisionYear) : null,
          parties: bookmark.parties || null,
          shortSummary: bookmark.shortSummary || null,
          timestamp: bookmark.timestamp ? Number(bookmark.timestamp) : null,
        }
      });

      return NextResponse.json({
        success: true,
        savedToDb: true,
        isBookmarked: true,
        bookmark: saved,
        message: 'แอดมิน: บันทึกบุคมาร์คลงฐานข้อมูลเรียบร้อย (ซิงค์ใช้งานได้ทุกเครื่อง)',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to handle bookmark request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
