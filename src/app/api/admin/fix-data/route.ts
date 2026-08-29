import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to convert arabic digits to thai digits
const arabicToThai = (text: string): string => {
  const map: Record<string, string> = {
    '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔',
    '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙'
  };
  return text.replace(/[0-9]/g, (match) => map[match]);
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, find, replace, lawFilter, decisionNumber, targetIds } = body;

    if (!find || typeof replace !== 'string') {
      return NextResponse.json({ error: "Missing find or replace parameter" }, { status: 400 });
    }

    const findThai = arabicToThai(find);
    const replaceThai = arabicToThai(replace);

    const where: any = { AND: [] };

    const searchOr = [
      { law: { contains: find } },
      { shortSummary: { contains: find } },
      { longSummary: { contains: find } },
    ];

    if (find !== findThai) {
      searchOr.push(
        { law: { contains: findThai } },
        { shortSummary: { contains: findThai } },
        { longSummary: { contains: findThai } }
      );
    }

    where.AND.push({ OR: searchOr });

    if (lawFilter) {
      where.AND.push({ law: { contains: lawFilter } });
    }

    if (decisionNumber) {
      where.AND.push({ decisionNumber: { equals: decisionNumber } });
    }

    if (action === 'apply' && targetIds && Array.isArray(targetIds) && targetIds.length > 0) {
      where.AND.push({ id: { in: targetIds } });
    }

    const decisions = await prisma.decision.findMany({
      where,
      select: {
        id: true,
        decisionNumber: true,
        law: true,
        shortSummary: true,
        longSummary: true,
      }
    });

    const isNumericFind = /^\d+$/.test(find);
    
    const replaceText = (text: string | null) => {
      if (!text) return text;
      let escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let escapedFindThai = findThai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      let regexStr = escapedFind;
      let regexStrThai = escapedFindThai;

      // If it's a number, use word boundaries to prevent replacing 801 inside 18010
      if (isNumericFind) {
        regexStr = `\\b${escapedFind}\\b`;
        regexStrThai = `\\b${escapedFindThai}\\b`;
      }

      return text
        .replace(new RegExp(regexStr, 'g'), replace)
        .replace(new RegExp(regexStrThai, 'g'), replaceThai);
    };

    const results = decisions.map(d => {
      return {
        id: d.id,
        decisionNumber: d.decisionNumber,
        oldLaw: d.law,
        newLaw: replaceText(d.law),
        oldShort: d.shortSummary,
        newShort: replaceText(d.shortSummary),
        oldLong: d.longSummary,
        newLong: replaceText(d.longSummary),
      };
    });

    if (action === 'preview') {
      return NextResponse.json({ count: results.length, data: results });
    }

    if (action === 'apply') {
      let updatedCount = 0;
      for (const r of results) {
        // Only update if there's an actual change
        if (r.oldLaw !== r.newLaw || r.oldShort !== r.newShort || r.oldLong !== r.newLong) {
          await prisma.decision.update({
            where: { id: r.id },
            data: {
              law: r.newLaw,
              shortSummary: r.newShort,
              longSummary: r.newLong,
            }
          });
          updatedCount++;
        }
      }
      return NextResponse.json({ success: true, updatedCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
