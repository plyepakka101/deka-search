import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { compareSectionNumbers } from '@/utils/sectionSort';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');

    // Fetch items from DB
    const whereClause: any = {};
    if (deckId) {
      whereClause.deckId = deckId;
    }

    const dbItems = await prisma.adminMemorizeItem.findMany({
      where: whereClause,
    });

    // Format & sort by section number ascending
    const formatted = dbItems.map((item: any) => ({
      id: item.id,
      deckId: item.deckId,
      sectionId: item.sectionId,
      title: item.title,
      sectionNumber: item.sectionNumber || undefined,
      bookId: item.bookId || undefined,
      repetitions: item.repetitions,
      intervalDays: item.intervalDays,
      easeFactor: item.easeFactor,
      streak: item.streak,
      status: item.status as any,
      nextReviewAt: item.nextReviewAt || undefined,
    })).sort((a: any, b: any) => {
      const secA = a.sectionNumber || a.title || '';
      const secB = b.sectionNumber || b.title || '';
      return compareSectionNumbers(secA, secB);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      items: formatted,
    });
  } catch (error: any) {
    console.error('Failed to fetch memorization items:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch items',
      items: [],
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    const body = await request.json();
    const { action, payload } = body;

    // If not admin, report that changes should stay local on client device
    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        savedToDb: false,
        message: 'ผู้ใช้ทั่วไป: บันทึกข้อมูลลงในอุปกรณ์นี้เรียบร้อย (สามารถส่งออกข้อมูลเพื่อย้ายเครื่องได้)',
      });
    }

    // Admin operations -> Persist to Turso Database
    if (action === 'add_item') {
      const { deckId, sectionId, title, sectionNumber, bookId } = payload;
      if (!deckId || !sectionId) {
        return NextResponse.json({ success: false, error: 'Missing deckId or sectionId' }, { status: 400 });
      }

      const id = `${deckId}_${sectionId}`;
      const item = await prisma.adminMemorizeItem.upsert({
        where: { id },
        update: {
          title: title || `มาตรา ${sectionNumber || sectionId}`,
          sectionNumber: sectionNumber || null,
          bookId: bookId || null,
          updatedAt: new Date(),
        },
        create: {
          id,
          deckId,
          sectionId,
          title: title || `มาตรา ${sectionNumber || sectionId}`,
          sectionNumber: sectionNumber || null,
          bookId: bookId || null,
          repetitions: 0,
          intervalDays: 1,
          easeFactor: 2.5,
          streak: 0,
          status: 'new',
          nextReviewAt: new Date().toISOString(),
        }
      });

      return NextResponse.json({
        success: true,
        savedToDb: true,
        item,
        message: 'แอดมิน: บันทึกลงฐานข้อมูลเรียบร้อย (ซิงค์ใช้งานได้ทุกเครื่อง)',
      });
    }

    if (action === 'remove_item') {
      const { itemId, deckId, sectionId } = payload;
      const targetId = itemId || (deckId && sectionId ? `${deckId}_${sectionId}` : null);

      if (targetId) {
        await prisma.adminMemorizeItem.deleteMany({
          where: { id: targetId },
        });
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ลบออกจากฐานข้อมูลเรียบร้อย',
      });
    }

    if (action === 'review') {
      const { itemId, quality, repetitions, intervalDays, easeFactor, streak, status, nextReviewAt } = payload;
      if (itemId) {
        await prisma.adminMemorizeItem.updateMany({
          where: { id: itemId },
          data: {
            repetitions: repetitions ?? undefined,
            intervalDays: intervalDays ?? undefined,
            easeFactor: easeFactor ?? undefined,
            streak: streak ?? undefined,
            status: status ?? undefined,
            nextReviewAt: nextReviewAt ?? undefined,
            updatedAt: new Date(),
          }
        });
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
      });
    }

    if (action === 'sync_all') {
      const { items } = payload;
      if (Array.isArray(items)) {
        for (const it of items) {
          const id = it.id || `${it.deckId}_${it.sectionId}`;
          await prisma.adminMemorizeItem.upsert({
            where: { id },
            update: {
              title: it.title,
              sectionNumber: it.sectionNumber || null,
              bookId: it.bookId || null,
              repetitions: it.repetitions ?? 0,
              intervalDays: it.intervalDays ?? 1,
              easeFactor: it.easeFactor ?? 2.5,
              streak: it.streak ?? 0,
              status: it.status ?? 'new',
              nextReviewAt: it.nextReviewAt || null,
              updatedAt: new Date(),
            },
            create: {
              id,
              deckId: it.deckId,
              sectionId: it.sectionId,
              title: it.title,
              sectionNumber: it.sectionNumber || null,
              bookId: it.bookId || null,
              repetitions: it.repetitions ?? 0,
              intervalDays: it.intervalDays ?? 1,
              easeFactor: it.easeFactor ?? 2.5,
              streak: it.streak ?? 0,
              status: it.status ?? 'new',
              nextReviewAt: it.nextReviewAt || null,
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ซิงค์ชุดข้อมูลท่องจำทั้งหมดเข้าฐานข้อมูลเรียบร้อย',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to handle memorization API request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
