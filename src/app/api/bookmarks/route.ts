import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_BULK = 2000;
const CHUNK_SIZE = 100;

interface NormalizedBookmark {
  id: string;
  decisionNumber: string;
  decisionYear: number | null;
  parties: string | null;
  shortSummary: string | null;
  timestamp: number | null;
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toStrOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function normalize(input: unknown): NormalizedBookmark | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.decisionNumber !== 'string' || !raw.decisionNumber) return null;
  return {
    id: raw.id,
    decisionNumber: raw.decisionNumber,
    decisionYear: toIntOrNull(raw.decisionYear),
    parties: toStrOrNull(raw.parties),
    shortSummary: toStrOrNull(raw.shortSummary),
    timestamp: toIntOrNull(raw.timestamp),
  };
}

interface RequestBody {
  action?: unknown;
  bookmark?: unknown;
  bookmarks?: unknown;
  upserts?: unknown;
  removes?: unknown;
}

// The libsql adapter types every INTEGER column as Int32, so reading `timestamp` (epoch ms)
// through a model query throws "number must be an integer in column 'timestamp'".
// Read via raw SQL with CAST(... AS TEXT) instead (typed as text -> always safe).
interface RawBookmarkRow {
  id: string;
  decisionNumber: string;
  decisionYear: string | number | null;
  parties: string | null;
  shortSummary: string | null;
  timestamp: string | number | null;
}

function fromRawRow(row: RawBookmarkRow) {
  return {
    id: row.id,
    decisionNumber: row.decisionNumber,
    decisionYear: toIntOrNull(row.decisionYear),
    parties: row.parties,
    shortSummary: row.shortSummary,
    timestamp: toIntOrNull(row.timestamp),
  };
}

function upsertOp(b: NormalizedBookmark) {
  const { id, ...data } = b;
  return prisma.adminBookmark.upsert({
    where: { id },
    update: { ...data, updatedAt: new Date() },
    create: { id, ...data },
    select: { id: true }, // never read `timestamp` back (see note above)
  });
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error('[api/bookmarks]', error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = Boolean(session?.user?.isAdmin);

    // Admin bookmarks are private to admins; everyone else only uses local storage.
    if (!isAdmin) {
      return NextResponse.json({ success: true, isAdmin: false, bookmarks: [] });
    }

    const rows = await prisma.$queryRaw<RawBookmarkRow[]>`
      SELECT "id", "decisionNumber",
             CAST("decisionYear" AS TEXT) AS "decisionYear",
             "parties", "shortSummary",
             CAST("timestamp" AS TEXT) AS "timestamp"
      FROM "AdminBookmark"
      ORDER BY "decisionYear" ASC, "decisionNumber" ASC`;

    return NextResponse.json({
      success: true,
      isAdmin: true,
      bookmarks: rows.map(fromRawRow),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch bookmarks');
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = Boolean(session?.user?.isAdmin);

    let body: RequestBody;
    try {
      body = ((await request.json()) ?? {}) as RequestBody;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const { action, bookmark } = body;

    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        savedToDb: false,
        message: 'ผู้ใช้ทั่วไป: บันทึกบุ๊กมาร์กในอุปกรณ์นี้เท่านั้น (เข้าสู่ระบบแอดมินเพื่อซิงค์ข้ามเครื่อง)',
      });
    }

    // Bulk sync: upserts + removals in one request. 'sync_all' is the legacy name.
    if (action === 'sync_ops' || action === 'sync_all') {
      const rawUpserts: unknown[] = Array.isArray(body.upserts)
        ? body.upserts
        : Array.isArray(body.bookmarks)
          ? body.bookmarks
          : [];
      const rawRemoves: unknown[] = Array.isArray(body.removes) ? body.removes : [];

      if (rawUpserts.length > MAX_BULK || rawRemoves.length > MAX_BULK) {
        return NextResponse.json({ success: false, error: 'Too many bookmarks in one request' }, { status: 413 });
      }

      const upserts = rawUpserts.map(normalize).filter((b): b is NormalizedBookmark => b !== null);
      const removes = rawRemoves.filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (removes.length > 0) {
        await prisma.adminBookmark.deleteMany({ where: { id: { in: removes } } });
      }
      for (let i = 0; i < upserts.length; i += CHUNK_SIZE) {
        await prisma.$transaction(upserts.slice(i, i + CHUNK_SIZE).map(upsertOp));
      }

      return NextResponse.json({
        success: true,
        savedToDb: true,
        upserted: upserts.length,
        removed: removes.length,
        message: 'แอดมิน: ซิงค์บุ๊กมาร์กลงฐานข้อมูลเรียบร้อย',
      });
    }

    if (action === 'remove') {
      const removeId = (bookmark as { id?: unknown } | null | undefined)?.id;
      if (typeof removeId === 'string' && removeId) {
        await prisma.adminBookmark.deleteMany({ where: { id: removeId } });
      }
      return NextResponse.json({
        success: true,
        savedToDb: true,
        message: 'แอดมิน: ลบบุ๊กมาร์กออกจากฐานข้อมูลเรียบร้อย',
      });
    }

    if (action === 'add' || action === 'toggle') {
      const normalized = normalize(bookmark);
      if (!normalized) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid bookmark (id, decisionNumber required)' },
          { status: 400 },
        );
      }

      if (action === 'toggle') {
        const existing = await prisma.adminBookmark.findUnique({
          where: { id: normalized.id },
          select: { id: true },
        });
        if (existing) {
          await prisma.adminBookmark.delete({ where: { id: normalized.id } });
          return NextResponse.json({
            success: true,
            savedToDb: true,
            isBookmarked: false,
            message: 'แอดมิน: ลบบุ๊กมาร์กออกจากฐานข้อมูลเรียบร้อย',
          });
        }
      }

      await upsertOp(normalized);

      return NextResponse.json({
        success: true,
        savedToDb: true,
        isBookmarked: true,
        bookmark: { ...normalized },
        message: 'แอดมิน: บันทึกบุ๊กมาร์กลงฐานข้อมูลเรียบร้อย (ซิงค์ใช้งานได้ทุกเครื่อง)',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return errorResponse(error, 'Internal Server Error');
  }
}
