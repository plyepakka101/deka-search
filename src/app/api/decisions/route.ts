import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');

  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const decisions = await prisma.decision.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        decisionNumber: true,
        decisionYear: true,
        parties: true,
        shortSummary: true
      }
    });

    // Create a map to return decisions in the same order as requested
    const decisionMap = new Map(decisions.map(d => [d.id, d]));
    const orderedDecisions = ids.map(id => decisionMap.get(id)).filter(Boolean);

    return NextResponse.json(orderedDecisions);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
