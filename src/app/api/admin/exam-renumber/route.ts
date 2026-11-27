import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getExamCategories } from '@/lib/examCategories';
import { renumberCategory } from '@/lib/examImport';

/** เรียงเลขข้อใหม่เป็น 1, 2, 3 ... ตามลำดับการนำเข้า — ส่ง { category } หรือ { all: true } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const names = (await getExamCategories()).map((c) => c.name);

    let targets: string[];
    if (body?.all === true) {
      targets = names;
    } else if (typeof body?.category === 'string' && names.includes(body.category)) {
      targets = [body.category];
    } else {
      return NextResponse.json({ error: 'ไม่พบหมวดที่ต้องการเรียงเลข' }, { status: 400 });
    }

    const results: Record<string, { total: number; changed: number }> = {};
    for (const cat of targets) {
      results[cat] = await renumberCategory(cat);
    }
    const changed = Object.values(results).reduce((sum, r) => sum + r.changed, 0);
    return NextResponse.json({ success: true, changed, results });
  } catch (error) {
    console.error('Error renumbering exam questions:', error);
    return NextResponse.json({ error: 'ไม่สามารถเรียงเลขข้อได้' }, { status: 500 });
  }
}
