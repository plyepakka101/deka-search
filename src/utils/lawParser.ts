import { thaiToArabic } from "@/components/law-mate/utils/textUtils";
import { parseLaws as parseLawsContent } from "@/components/law-mate/services/lawParser";
import { prisma } from "@/lib/prisma";

export const LAW_MAP: Record<string, string> = {
  'ป.อ.': 'ประมวลกฎหมายอาญา',
  'ป.พ.พ.': 'ประมวลกฎหมายแพ่งและพาณิชย์',
  'ป.วิ.พ.': 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
  'ป.วิ.อ.': 'ประมวลกฎหมายวิธีพิจารณาความอาญา',
  'ป.รัษฎากร': 'ประมวลรัษฎากร',
  'ป.ที่ดิน': 'ประมวลกฎหมายที่ดิน',
  'ป.ยาเสพติด': 'ประมวลกฎหมายยาเสพติด',
  'พ.ร.บ.จราจรทางบก': 'พระราชบัญญัติจราจรทางบก พ.ศ. 2522',
  'พระราชบัญญัติจราจรทางบก': 'พระราชบัญญัติจราจรทางบก พ.ศ. 2522',
  'อาชญา': 'กฎหมายลักษณะอาญา',
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
  normalized = normalized.replace(/พุทธศักราช.*$/, '');
  return normalized;
}

const VALID_SUFFIXES = ['ทวิ', 'ตรี', 'จัตวา', 'เบญจ', 'ฉอ', 'ฉ', 'สัปต', 'สัตต', 'อัฐ', 'อัฏฐ', 'นพ', 'นว', 'ทศ'];
const suffixPattern = VALID_SUFFIXES.join('|');

const LAW_PREFIXES = [
  'ป\\.[ก-๙\\.]+',
  'พ\\.ร\\.บ\\.[ก-๙\\.\\s0-9]+',
  'พ\\.ร\\.ก\\.[ก-๙\\.\\s0-9]+',
  'พ\\.ร\\.ฎ\\.[ก-๙\\.\\s0-9]+',
  'พ\\.ธ\\.น\\.[ก-๙\\.\\s0-9]+',
  'ประมวลกฎหมาย[ก-๙\\.\\s]+',
  'ประมวล[ก-๙\\.\\s]+',
  'พระราชบัญญัติ[ก-๙\\.\\s0-9]+',
  'พระราชกำหนด[ก-๙\\.\\s0-9]+',
  'พระราชกฤษฎีกา[ก-๙\\.\\s0-9]+',
  'พระธรรมนูญ[ก-๙\\.\\s0-9]+',
  'รัฐธรรมนูญ[ก-๙\\.\\s0-9]+',
  'กฎหมายลักษณะ[ก-๙\\.\\s0-9]+',
  'ประกาศ[ก-๙\\.\\s0-9]+',
  'กฎกระทรวง[ก-๙\\.\\s0-9]+',
  'ระเบียบ[ก-๙\\.\\s0-9]+',
  'ข้อกำหนด[ก-๙\\.\\s0-9]+',
  'ข้อบังคับ[ก-๙\\.\\s0-9]+',
  'อาชญา\\b'
];
const lawSplitRegex = new RegExp(`(?<!แห่ง)(?=(?:${LAW_PREFIXES.join('|')}))`);

/**
 * Extracts pure legal section numbers from a raw string that follows "ม." or "มาตรา"
 */
export function extractSectionsFromPart(part: string): string[] {
  if (!part) return [];
  let text = thaiToArabic(part).trim();

  // Fix known glued numbers
  const typos: Record<string, string> = {
    "2930": "29, 30",
    "28881": "288, 81",
    "83340": "83, 340",
    "157160": "157, 160",
    "309310": "309, 310"
  };
  for (const [glued, fixed] of Object.entries(typos)) {
    text = text.replace(new RegExp(`\\b${glued}\\b`, 'g'), fixed);
  }

  // Remove "ข้อ \d+" and standalone "ข้อ" so it doesn't get confused with sections
  text = text.replace(/ข้อ\s*\d+/g, ' ');
  text = text.replace(/ข้อ/g, ' ');

  // Cut off everything starting from subsequent law names, year keywords, or long explanatory phrases
  text = text.replace(/\s+(?:พ\.ศ\.|พ\.ร\.บ\.|พ\.ร\.ก\.|พ\.ร\.ฎ\.|ป\.|ประกาศ|ระเบียบ|ข้อกำหนด|กฎกระทรวง|ให้ใช้บทบัญญัติ|แห่ง).*$/i, '');
  text = text.replace(/\s+พ\.?$/g, '');

  // Remove paragraph / version markers: "วรรค...", "เดิม"
  text = text.replace(/วรรค\s*(?:[ก-๙\d]+)?/g, ' ');
  text = text.replace(/\bเดิม\b/g, ' ');

  // Unwrap standalone parenthesized number like "(4)" -> "4"
  text = text.replace(/^\s*\(\s*(\d+(?:\/\d+)?)\s*\)\s*$/, '$1');

  // Remove any remaining parenthesized content, e.g. (1), (7), (นายจ้าง...)
  text = text.replace(/\([^)]*\)?/g, ' ');

  // Replace separators:
  // commas, semicolons, Thai conjunctions "และ", "กับ", "ถึง", dashes '-'
  text = text.replace(/[,;–—]|\s+และ\s+|\s+กับ\s+|\s+ถึง\s+/g, ' ');
  text = text.replace(/-/g, ' ');

  // Now find valid section numbers:
  // Matches: 193/30, 309 ทวิ, 4, 1585
  const regex = new RegExp(`(?:^|\\s)(\\d+(?:\\/[1-9]\\d{0,2})?(?:\\s*(?:${suffixPattern}))?)(?=\\s|$|[^ก-๙a-zA-Z0-9/])`, 'g');
  
  const sections: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    let s = match[1].trim();
    // Normalize spaces in suffix, e.g. "309  ทวิ" -> "309 ทวิ"
    s = s.replace(/\s+/g, ' ');
    if (s && !sections.includes(s)) {
      sections.push(s);
    }
  }

  return sections;
}

export function parseLaws(lawStr: string | null): ParsedLaw[] {
  if (!lawStr) return [];
  
  const results: ParsedLaw[] = [];
  const lawTokens = lawStr.split(lawSplitRegex);
  
  for (let token of lawTokens) {
    token = token.trim();
    if (!token) continue;
    
    const parts = token.split(/(?:ม\.|มาตรา)\s*/);
    if (parts.length > 0) {
      const rawLawName = parts[0].trim();
      if (!rawLawName) continue;
      
      const sections = parts.slice(1).flatMap(p => extractSectionsFromPart(p));
      const normalized = normalizeLawName(rawLawName);
      
      if (sections.length > 0) {
        results.push({ 
          lawName: rawLawName, 
          mappedName: LAW_MAP[rawLawName] || LAW_MAP[normalized] || normalized,
          sections 
        });
      }
    }
  }
  
  return results;
}

export function compareSections(a: string, b: string): number {
  const matchA = a.match(/^(\d+)(?:\/(\d+))?(?:\s*(.*))?$/);
  const matchB = b.match(/^(\d+)(?:\/(\d+))?(?:\s*(.*))?$/);
  if (matchA && matchB) {
    const baseA = parseInt(matchA[1], 10);
    const baseB = parseInt(matchB[1], 10);
    if (baseA !== baseB) return baseA - baseB;

    const slashA = matchA[2] ? parseInt(matchA[2], 10) : 0;
    const slashB = matchB[2] ? parseInt(matchB[2], 10) : 0;
    if (slashA !== slashB) return slashA - slashB;

    const suffixA = matchA[3] || "";
    const suffixB = matchB[3] || "";
    return suffixA.localeCompare(suffixB, 'th');
  }
  return a.localeCompare(b, 'th', { numeric: true });
}

const categoryLookupCache = new Map<string, string>();
let isCacheBuilt = false;

export async function initCategoryCache() {
  if (isCacheBuilt) return;
  
  const books = await prisma.lawBook.findMany();
  for (const book of books) {
    const parsedSections = parseLawsContent(book.content, book.id, book.name);
    for (const l of parsedSections) {
      if (l.category && l.sectionNumber) {
         const rootName = l.category.split(' > ')[0].trim();
         const normSection = thaiToArabic(l.sectionNumber).trim();
         categoryLookupCache.set(`${rootName}:${normSection}`, l.category);
      }
    }
  }
  isCacheBuilt = true;
}

export function getSectionCategory(lawName: string, sectionNumber: string): string {
  // First check exact match, e.g. "ประมวลกฎหมายวิธีพิจารณาความแพ่ง:309 ทวิ"
  const exactKey = `${lawName.trim()}:${sectionNumber.trim()}`;
  if (categoryLookupCache.has(exactKey)) {
    return categoryLookupCache.get(exactKey)!;
  }

  // Extract base number from section (e.g. "14/1" -> "14", "1336" -> "1336", "309 ทวิ" -> "309")
  const baseSectionMatch = sectionNumber.match(/\d+/);
  const baseSection = baseSectionMatch ? baseSectionMatch[0] : sectionNumber.trim();
  
  const key = `${lawName.trim()}:${baseSection}`;
  return categoryLookupCache.get(key) || `${lawName} (มาตราทั่วไป / อื่นๆ)`;
}
