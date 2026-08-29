import { PrismaClient } from '@prisma/client';
import { thaiToArabic } from "@/components/law-mate/utils/textUtils";

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

export function parseLaws(lawStr: string | null): ParsedLaw[] {
  if (!lawStr) return [];
  
  const results: ParsedLaw[] = [];
  
  const lawTokens = lawStr.split(/(?=(?:ป\.[ก-๙\.]+|พ\.ร\.บ\.[ก-๙\.\s0-9]+|ประมวลกฎหมาย[ก-๙\.\s]+|พระราชบัญญัติ[ก-๙\.\s0-9]+|รัฐธรรมนูญ[ก-๙\.\s0-9]+))/);
  
  for (let token of lawTokens) {
    token = token.trim();
    if (!token) continue;
    
    const parts = token.split(/(?:ม\.|มาตรา)\s*/);
    if (parts.length > 0) {
      const rawLawName = parts[0].trim();
      if (!rawLawName) continue;
      
      const sections = parts.slice(1).flatMap(p => {
        let cleanedP = thaiToArabic(p);
        
        // Fix known glued numbers
        const typos: Record<string, string> = {
          "2930": "29, 30",
          "28881": "288, 81",
          "83340": "83, 340",
          "157160": "157, 160",
          "309310": "309, 310"
        };
        for (const [glued, fixed] of Object.entries(typos)) {
          cleanedP = cleanedP.replace(new RegExp(`\\b${glued}\\b`, 'g'), fixed);
        }

        // Split by commas, dots, or Thai words "และ", "กับ" to treat each section individually
        return cleanedP.split(/,|\.|\s+และ\s+|\s+กับ\s+/).map(s => s.replace(/^[,\.]+|[,\.]+$/g, '').trim()).filter(Boolean);
      });
      
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

import { parseLaws as parseLawsContent } from "@/components/law-mate/services/lawParser";
import { prisma } from "@/lib/prisma";

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
  // Extract base number from section (e.g. "797 วรรคสอง" -> "797", "14/1" -> "14", "1336" -> "1336")
  const baseSectionMatch = sectionNumber.match(/\d+(\/\d+)?(\.\d+)?/);
  const baseSection = baseSectionMatch ? baseSectionMatch[0] : sectionNumber.trim();
  
  const key = `${lawName.trim()}:${baseSection}`;
  return categoryLookupCache.get(key) || `${lawName} (มาตราทั่วไป / อื่นๆ)`;
}
