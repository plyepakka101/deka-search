import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseLaws(lawStr: string | null) {
  if (!lawStr) return [];
  
  const results: { lawName: string, sections: string[] }[] = [];
  
  // Regular expression to match law names. 
  // It matches abbreviations like "ป.อ.", "ป.พ.พ." or "พ.ร.บ. ... พ.ศ...."
  // We can look for keywords like "ป.", "พ.ร.บ.", "รัฐธรรมนูญ"
  const lawTokens = lawStr.split(/(?=(?:ป\.[ก-๙\.]+|พ\.ร\.บ\.[ก-๙\.\s0-๙]+|รัฐธรรมนูญ[ก-๙\.\s0-๙]+))/);
  
  for (let token of lawTokens) {
    token = token.trim();
    if (!token) continue;
    
    // The token might be "ป.พ.พ. ม. 657, ม. 665"
    // Split by "ม." or "มาตรา"
    const parts = token.split(/(?:ม\.|มาตรา)\s*/);
    if (parts.length > 0) {
      const rawLawName = parts[0].trim();
      if (!rawLawName) continue; // It didn't start with a law name
      
      const sections = parts.slice(1).map(p => {
        // Strip out trailing commas or spaces, and next law names if any (though our split above should handle next law names)
        return p.replace(/,$/, '').trim();
      }).filter(Boolean);
      
      results.push({ lawName: rawLawName, sections });
    }
  }
  
  return results;
}

async function main() {
  const decisions = await prisma.decision.findMany({
    select: { id: true, decisionNumber: true, law: true },
    take: 10
  });

  decisions.forEach(d => {
    console.log(`\nRAW: [${d.decisionNumber}] ${d.law}`);
    console.log(`PARSED:`, JSON.stringify(parseLaws(d.law), null, 2));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
