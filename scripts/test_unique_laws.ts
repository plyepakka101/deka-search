import { PrismaClient } from '@prisma/client';

export const LAW_MAP: Record<string, string> = {
  'ป.อ.': 'ประมวลกฎหมายอาญา',
  'ป.พ.พ.': 'ประมวลกฎหมายแพ่งและพาณิชย์',
  'ป.วิ.พ.': 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
  'ป.วิ.อ.': 'ประมวลกฎหมายวิธีพิจารณาความอาญา',
  'ป.รัษฎากร': 'ประมวลรัษฎากร',
  'ป.ที่ดิน': 'ประมวลกฎหมายที่ดิน',
  'ป.ยาเสพติด': 'ประมวลกฎหมายยาเสพติด',
};

export interface ParsedLaw {
  lawName: string;
  mappedName: string;
  sections: string[];
}

export function normalizeLawName(name: string): string {
  let normalized = name.trim();
  normalized = normalized.replace(/^พ\.ร\.บ\.?\s*/, 'พระราชบัญญัติ');
  normalized = normalized.replace(/\s+/g, '');
  normalized = normalized.replace(/ฯ/g, '');
  normalized = normalized.replace(/พ\.ศ\..*$/, '');
  return normalized;
}

export function parseLaws(lawStr: string | null): ParsedLaw[] {
  if (!lawStr) return [];
  
  const results: ParsedLaw[] = [];
  
  const lawTokens = lawStr.split(/(?=(?:ป\.[ก-๙\.]+|พ\.ร\.บ\.[ก-๙\.\s0-๙]+|ประมวลกฎหมาย[ก-๙\.\s]+|พระราชบัญญัติ[ก-๙\.\s0-๙]+|รัฐธรรมนูญ[ก-๙\.\s0-๙]+))/);
  
  for (let token of lawTokens) {
    token = token.trim();
    if (!token) continue;
    
    const parts = token.split(/(?:ม\.|มาตรา)\s*/);
    if (parts.length > 0) {
      const rawLawName = parts[0].trim();
      if (!rawLawName) continue;
      
      const sections = parts.slice(1).map(p => {
        return p.replace(/,\s*$/, '').trim();
      }).filter(Boolean);
      
      const normalized = normalizeLawName(rawLawName);
      
      results.push({ 
        lawName: rawLawName, 
        mappedName: LAW_MAP[rawLawName] || LAW_MAP[normalized] || normalized,
        sections 
      });
    }
  }
  
  return results;
}

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    select: { law: true }
  });

  const rawNames = new Set<string>();
  const mappedNames = new Set<string>();
  
  for (const d of decisions) {
    if (!d.law) continue;
    const parsed = parseLaws(d.law);
    for (const p of parsed) {
      rawNames.add(p.lawName);
      mappedNames.add(p.mappedName);
    }
  }

  console.log("Unique Mapped Names:");
  const sortedMapped = Array.from(mappedNames).sort();
  for (const name of sortedMapped) {
    console.log(name);
  }
}

main().catch(console.error);
