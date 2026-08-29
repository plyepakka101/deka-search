import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractLawsFromSummary(summary: string): string[] {
  const results: string[] = [];
  
  const lawRegex = /(ป\.(?:อ\.|พ\.พ\.|วิ\.พ\.|วิ\.อ\.|รัษฎากร|ที่ดิน|ยาเสพติด)|ประมวลกฎหมาย(?:อาญา|แพ่งและพาณิชย์|วิธีพิจารณาความแพ่ง|วิธีพิจารณาความอาญา|รัษฎากร|ที่ดิน|ยาเสพติด)|(?:พ\.ร\.บ\.|พระราชบัญญัติ|รัฐธรรมนูญ)[ก-๙\.\s0-9๐-๙ฯ]{1,60}?)\s*(?:ประกอบ)?\s*(?:มาตรา|ม\.)\s*[0-9๐-๙]+(?:[\.,\s]*[0-9๐-๙]+)*/g;

  let match;
  while ((match = lawRegex.exec(summary)) !== null) {
      const fullMatch = match[0];
      const lawName = match[1].trim();
      
      if (!/โจทก์|จำเลย|ศาล|พิพากษา|ฟ้อง|ว่า|ซึ่ง/.test(lawName)) {
          results.push(fullMatch.replace(/\s+/g, ' '));
      }
  }
  
  return results;
}

async function main() {
  let updatedCount = 0;
  let skip = 0;
  const take = 5000;
  
  // Null out EVERYTHING to start fresh
  console.log("Resetting all laws to null...");
  await prisma.$executeRaw`UPDATE Decision SET law = NULL`;
  console.log("Reset complete. Starting extraction...");

  while (true) {
    const decisions = await prisma.decision.findMany({
      where: { law: null },
      select: { id: true, shortSummary: true, longSummary: true },
      skip,
      take
    });

    if (decisions.length === 0) break;
    
    for (const d of decisions) {
      const summary = (d.shortSummary || '') + " " + (d.longSummary || '');
      
      const laws = extractLawsFromSummary(summary);
      
      if (laws.length > 0) {
          const lawStr = laws.join(", ");
          await prisma.decision.update({
              where: { id: d.id },
              data: { law: lawStr }
          });
          updatedCount++;
      }
    }
    
    console.log(`Processed ${skip + decisions.length} rows... Updated ${updatedCount} laws.`);
    skip += take;
  }
  
  console.log(`Done. Updated ${updatedCount} decisions with extracted laws.`);
}

main().catch(console.error);
