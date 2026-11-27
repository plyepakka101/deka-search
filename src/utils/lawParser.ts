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
  'พ.ร.บ.ล้มละลาย': 'พระราชบัญญัติล้มละลาย พ.ศ. 2483',
  'พระราชบัญญัติล้มละลาย': 'พระราชบัญญัติล้มละลาย พ.ศ. 2483',
  'อาชญา': 'กฎหมายลักษณะอาญา',
};

export const REVERSE_LAW_MAP: Record<string, string> = {
  'ประมวลกฎหมายอาญา': 'ป.อ.',
  'ประมวลกฎหมายแพ่งและพาณิชย์': 'ป.พ.พ.',
  'ประมวลกฎหมายวิธีพิจารณาความแพ่ง': 'ป.วิ.พ.',
  'ประมวลกฎหมายวิธีพิจารณาความอาญา': 'ป.วิ.อ.',
  'ประมวลรัษฎากร': 'ป.รัษฎากร',
  'ประมวลกฎหมายที่ดิน': 'ป.ที่ดิน',
  'ประมวลกฎหมายยาเสพติด': 'ป.ยาเสพติด',
  'พระราชบัญญัติล้มละลาย พ.ศ. 2483': 'พ.ร.บ.ล้มละลาย',
  'พระราชบัญญัติจราจรทางบก พ.ศ. 2522': 'พ.ร.บ.จราจรทางบก',
  'กฎหมายลักษณะอาญา': 'อาชญา',
  'รัฐธรรมนูญแห่งราชอาณาจักรไทย': 'รธน.',
  'พระธรรมนูญศาลยุติธรรม': 'พระธรรมนูญ',
};

export const KNOWN_CANONICAL_LAWS = [
  {
    patterns: [/^ป\.อ\.?$/, /^ประมวลกฎหมายอาญา/],
    key: 'ประมวลกฎหมายอาญา',
    name: 'ประมวลกฎหมายอาญา',
    short: 'ป.อ.'
  },
  {
    patterns: [/^ป\.พ\.พ\.?$/, /^ประมวลกฎหมายแพ่ง/],
    key: 'ประมวลกฎหมายแพ่งและพาณิชย์',
    name: 'ประมวลกฎหมายแพ่งและพาณิชย์',
    short: 'ป.พ.พ.'
  },
  {
    patterns: [/^ป\.วิ\.พ\.?$/, /^ประมวลกฎหมายวิธีพิจารณาความแพ่ง/],
    key: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
    name: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
    short: 'ป.วิ.พ.'
  },
  {
    patterns: [/^ป\.วิ\.อ\.?$/, /^ประมวลกฎหมายวิธีพิจารณาความอาญา/],
    key: 'ประมวลกฎหมายวิธีพิจารณาความอาญา',
    name: 'ประมวลกฎหมายวิธีพิจารณาความอาญา',
    short: 'ป.วิ.อ.'
  },
  {
    patterns: [/^ป\.ที่ดิน$/, /^ประมวลกฎหมายที่ดิน/],
    key: 'ประมวลกฎหมายที่ดิน',
    name: 'ประมวลกฎหมายที่ดิน',
    short: 'ป.ที่ดิน'
  },
  {
    patterns: [/^ป\.รัษฎากร$/, /^ประมวลรัษฎากร/],
    key: 'ประมวลรัษฎากร',
    name: 'ประมวลรัษฎากร',
    short: 'ป.รัษฎากร'
  },
  {
    patterns: [/^ป\.ยาเสพติด$/, /^ประมวลกฎหมายยาเสพติด/],
    key: 'ประมวลกฎหมายยาเสพติด',
    name: 'ประมวลกฎหมายยาเสพติด',
    short: 'ป.ยาเสพติด'
  },
  {
    patterns: [/^รธน\.?$/, /^รัฐธรรมนูญ/],
    key: 'รัฐธรรมนูญแห่งราชอาณาจักรไทย',
    name: 'รัฐธรรมนูญแห่งราชอาณาจักรไทย',
    short: 'รธน.'
  },
  {
    patterns: [/^พระธรรมนูญ/, /^พ\.ธ\.น\.?/],
    key: 'พระธรรมนูญศาลยุติธรรม',
    name: 'พระธรรมนูญศาลยุติธรรม',
    short: 'พระธรรมนูญ'
  },
  {
    patterns: [/^อาชญา$/, /^กฎหมายลักษณะอาญา/],
    key: 'กฎหมายลักษณะอาญา',
    name: 'กฎหมายลักษณะอาญา',
    short: 'อาชญา'
  },
  // Specific Acts (more specific patterns listed before broader ones)
  {
    patterns: [/จัดตั้งศาลล้มละลาย/],
    key: 'พระราชบัญญัติจัดตั้งศาลล้มละลายและวิธีพิจารณาคดีล้มละลาย',
    name: 'พระราชบัญญัติจัดตั้งศาลล้มละลายและวิธีพิจารณาคดีล้มละลาย พ.ศ. 2542',
    short: 'พ.ร.บ.จัดตั้งศาลล้มละลายฯ'
  },
  {
    patterns: [/ล้มละลาย/],
    key: 'พระราชบัญญัติล้มละลาย',
    name: 'พระราชบัญญัติล้มละลาย พ.ศ. 2483',
    short: 'พ.ร.บ.ล้มละลาย'
  },
  {
    patterns: [/จราจรทางบก/],
    key: 'พระราชบัญญัติจราจรทางบก',
    name: 'พระราชบัญญัติจราจรทางบก พ.ศ. 2522',
    short: 'พ.ร.บ.จราจรทางบก'
  },
  {
    patterns: [/จัดตั้งศาลแขวง/],
    key: 'พระราชบัญญัติจัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง',
    name: 'พระราชบัญญัติจัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง พ.ศ. 2499',
    short: 'พ.ร.บ.จัดตั้งศาลแขวงฯ'
  },
  {
    patterns: [/วิธีพิจารณาความอาญาในศาลแขวงมาใช้บังคับในศาลจังหวัด/],
    key: 'พระราชบัญญัติให้นำวิธีพิจารณาความอาญาในศาลแขวงมาใช้บังคับในศาลจังหวัด',
    name: 'พระราชบัญญัติให้นำวิธีพิจารณาความอาญาในศาลแขวงมาใช้บังคับในศาลจังหวัด พ.ศ. 2520',
    short: 'พ.ร.บ.วิธีพิจารณาฯ ศาลจังหวัด'
  },
  {
    patterns: [/อาวุธปืน/],
    key: 'พระราชบัญญัติอาวุธปืน',
    name: 'พระราชบัญญัติอาวุธปืน เครื่องกระสุนปืน วัตถุระเบิด ดอกไม้เพลิง และสิ่งเทียมอาวุธปืน พ.ศ. 2490',
    short: 'พ.ร.บ.อาวุธปืนฯ'
  },
  {
    patterns: [/คุ้มครองแรงงาน/],
    key: 'พระราชบัญญัติคุ้มครองแรงงาน',
    name: 'พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541',
    short: 'พ.ร.บ.คุ้มครองแรงงาน'
  },
  {
    patterns: [/ฟอกเงิน/],
    key: 'พระราชบัญญัติป้องกันและปราบปรามการฟอกเงิน',
    name: 'พระราชบัญญัติป้องกันและปราบปรามการฟอกเงิน พ.ศ. 2542',
    short: 'พ.ร.บ.ฟอกเงิน'
  },
  {
    patterns: [/วิธีพิจารณาคดียาเสพติด/],
    key: 'พระราชบัญญัติวิธีพิจารณาคดียาเสพติด',
    name: 'พระราชบัญญัติวิธีพิจารณาคดียาเสพติด พ.ศ. 2550',
    short: 'พ.ร.บ.วิธีพิจารณาคดียาเสพติด'
  },
  {
    patterns: [/คอมพิวเตอร์/],
    key: 'พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์',
    name: 'พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550',
    short: 'พ.ร.บ.คอมพิวเตอร์'
  },
  {
    patterns: [/ศาลเยาวชนและครอบครัว/],
    key: 'พระราชบัญญัติศาลเยาวชนและครอบครัวและวิธีพิจารณาคดีเยาวชนและครอบครัว',
    name: 'พระราชบัญญัติศาลเยาวชนและครอบครัวและวิธีพิจารณาคดีเยาวชนและครอบครัว พ.ศ. 2553',
    short: 'พ.ร.บ.ศาลเยาวชนฯ'
  },
  {
    patterns: [/คุมประพฤติ/],
    key: 'พระราชบัญญัติคุมประพฤติ',
    name: 'พระราชบัญญัติคุมประพฤติ พ.ศ. 2559',
    short: 'พ.ร.บ.คุมประพฤติ'
  },
  {
    patterns: [/แรงงานสัมพันธ์/],
    key: 'พระราชบัญญัติแรงงานสัมพันธ์',
    name: 'พระราชบัญญัติแรงงานสัมพันธ์ พ.ศ. 2518',
    short: 'พ.ร.บ.แรงงานสัมพันธ์'
  },
  {
    patterns: [/จัดตั้งศาลแรงงาน/],
    key: 'พระราชบัญญัติจัดตั้งศาลแรงงานและวิธีพิจารณาคดีแรงงาน',
    name: 'พระราชบัญญัติจัดตั้งศาลแรงงานและวิธีพิจารณาคดีแรงงาน พ.ศ. 2522',
    short: 'พ.ร.บ.จัดตั้งศาลแรงงานฯ'
  },
  {
    patterns: [/จัดตั้งศาลทรัพย์สินทางปัญญา/],
    key: 'พระราชบัญญัติจัดตั้งศาลทรัพย์สินทางปัญญาและการค้าระหว่างประเทศและวิธีพิจารณาคดีทรัพย์สินทางปัญญาและการค้าระหว่างประเทศ',
    name: 'พระราชบัญญัติจัดตั้งศาลทรัพย์สินทางปัญญาและการค้าระหว่างประเทศและวิธีพิจารณาคดีทรัพย์สินทางปัญญาและการค้าระหว่างประเทศ พ.ศ. 2539',
    short: 'พ.ร.บ.จัดตั้งศาลทรัพย์สินทางปัญญาฯ'
  },
  {
    patterns: [/ลิขสิทธิ์/],
    key: 'พระราชบัญญัติลิขสิทธิ์',
    name: 'พระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537',
    short: 'พ.ร.บ.ลิขสิทธิ์'
  },
  {
    patterns: [/สิทธิบัตร/],
    key: 'พระราชบัญญัติสิทธิบัตร',
    name: 'พระราชบัญญัติสิทธิบัตร พ.ศ. 2522',
    short: 'พ.ร.บ.สิทธิบัตร'
  },
  {
    patterns: [/เครื่องหมายการค้า/],
    key: 'พระราชบัญญัติเครื่องหมายการค้า',
    name: 'พระราชบัญญัติเครื่องหมายการค้า พ.ศ. 2534',
    short: 'พ.ร.บ.เครื่องหมายการค้า'
  },
  {
    patterns: [/จัดตั้งศาลปกครอง/],
    key: 'พระราชบัญญัติจัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง',
    name: 'พระราชบัญญัติจัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง พ.ศ. 2542',
    short: 'พ.ร.บ.จัดตั้งศาลปกครองฯ'
  },
  {
    patterns: [/ประกันสังคม/],
    key: 'พระราชบัญญัติประกันสังคม',
    name: 'พระราชบัญญัติประกันสังคม พ.ศ. 2533',
    short: 'พ.ร.บ.ประกันสังคม'
  },
  {
    patterns: [/เงินทดแทน/],
    key: 'พระราชบัญญัติเงินทดแทน',
    name: 'พระราชบัญญัติเงินทดแทน พ.ศ. 2537',
    short: 'พ.ร.บ.เงินทดแทน'
  },
  {
    patterns: [/ศุลกากร/],
    key: 'พระราชบัญญัติศุลกากร',
    name: 'พระราชบัญญัติศุลกากร พ.ศ. 2560',
    short: 'พ.ร.บ.ศุลกากร'
  },
  {
    patterns: [/สรรพสามิต/],
    key: 'พระราชบัญญัติภาษีสรรพสามิต',
    name: 'พระราชบัญญัติภาษีสรรพสามิต พ.ศ. 2560',
    short: 'พ.ร.บ.ภาษีสรรพสามิต'
  },
  {
    patterns: [/เทศบาล/],
    key: 'พระราชบัญญัติเทศบาล',
    name: 'พระราชบัญญัติเทศบาล พ.ศ. 2496',
    short: 'พ.ร.บ.เทศบาล'
  },
  {
    patterns: [/ระเบียบบริหารราชการแผ่นดิน/],
    key: 'พระราชบัญญัติระเบียบบริหารราชการแผ่นดิน',
    name: 'พระราชบัญญัติระเบียบบริหารราชการแผ่นดิน พ.ศ. 2534',
    short: 'พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน'
  },
  {
    patterns: [/ข้อมูลข่าวสารของราชการ/],
    key: 'พระราชบัญญัติข้อมูลข่าวสารของราชการ',
    name: 'พระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. 2540',
    short: 'พ.ร.บ.ข้อมูลข่าวสารฯ'
  },
  {
    patterns: [/วิธีปฏิบัติราชการทางปกครอง/],
    key: 'พระราชบัญญัติวิธีปฏิบัติราชการทางปกครอง',
    name: 'พระราชบัญญัติวิธีปฏิบัติราชการทางปกครอง พ.ศ. 2539',
    short: 'พ.ร.บ.วิธีปฏิบัติราชการทางปกครอง'
  },
  {
    patterns: [/ความรับผิดทางละเมิดของเจ้าหน้าที่/],
    key: 'พระราชบัญญัติความรับผิดทางละเมิดของเจ้าหน้าที่',
    name: 'พระราชบัญญัติความรับผิดทางละเมิดของเจ้าหน้าที่ พ.ศ. 2539',
    short: 'พ.ร.บ.ความรับผิดทางละเมิดฯ'
  }
];

export function canonicalizeLaw(rawLawName: string): { lawKey: string; lawName: string; shortName: string } {
  const clean = rawLawName.replace(/^[,\s;:]+|[,\s;:]+$/g, '').trim();

  // 1. Try known canonical list
  for (const item of KNOWN_CANONICAL_LAWS) {
    if (item.patterns.some((p) => p.test(clean))) {
      return {
        lawKey: item.key,
        lawName: item.name,
        shortName: item.short
      };
    }
  }

  // 2. Generic Fallback for any other Acts/Codes
  // Always expand abbreviations to full principal names for categories, and keep standard short names
  let full = clean;
  let short = clean;

  if (/^พ\.ร\.บ\.?\s*/.test(clean)) {
    full = clean.replace(/^พ\.ร\.บ\.?\s*/, 'พระราชบัญญัติ');
    short = clean.replace(/\s*\(ฉบับที่\s*\d+\).*$/, '').replace(/\s*พ\.ศ\..*$/, '').trim();
  } else if (/^พระราชบัญญัติ/.test(clean)) {
    full = clean;
    short = clean.replace(/^พระราชบัญญัติ\s*/, 'พ.ร.บ.').replace(/\s*\(ฉบับที่\s*\d+\).*$/, '').replace(/\s*พ\.ศ\..*$/, '').trim();
  } else if (/^ป\.\s*/.test(clean)) {
    full = clean.replace(/^ป\.\s*/, 'ประมวลกฎหมาย');
    short = clean;
  }

  // Strip amendment like (ฉบับที่ 3) from category key to merge amended acts into the principal act
  const baseName = full.replace(/\s*\(ฉบับที่\s*\d+\).*$/, '').replace(/\s*พ\.ศ\..*$/, '').trim();

  return {
    lawKey: baseName,
    lawName: full,
    shortName: short
  };
}

export interface DekaLawItem {
  lawKey: string;           // Normalized identifier for grouping
  lawName: string;          // Full Thai name, e.g. "ประมวลกฎหมายแพ่งและพาณิชย์"
  shortName: string;        // Short abbreviation, e.g. "ป.พ.พ."
  sections: string[];       // Array of section strings, e.g. ["856", "860"]
}

export function extractDekaLaws(lawStr?: string | null): DekaLawItem[] {
  if (!lawStr || !lawStr.trim()) {
    return [{
      lawKey: 'unspecified',
      lawName: 'ไม่ระบุกฎหมาย',
      shortName: 'ไม่ระบุ',
      sections: []
    }];
  }

  const rawTokens = lawStr.split(lawSplitRegex);
  const mapByLawKey = new Map<string, DekaLawItem>();

  for (let token of rawTokens) {
    token = token.trim();
    if (!token) continue;

    const parts = token.split(/(?:ม\.|มาตรา)\s*/);
    const rawLawName = parts[0]?.trim();
    if (!rawLawName) continue;

    const sections = parts.slice(1).flatMap(p => extractSectionsFromPart(p));
    const canon = canonicalizeLaw(rawLawName);

    const existing = mapByLawKey.get(canon.lawKey);
    if (existing) {
      for (const sec of sections) {
        if (!existing.sections.includes(sec)) {
          existing.sections.push(sec);
        }
      }
    } else {
      mapByLawKey.set(canon.lawKey, {
        lawKey: canon.lawKey,
        lawName: canon.lawName,
        shortName: canon.shortName,
        sections
      });
    }
  }

  if (mapByLawKey.size === 0) {
    return [{
      lawKey: 'unspecified',
      lawName: 'ไม่ระบุกฎหมาย',
      shortName: 'ไม่ระบุ',
      sections: []
    }];
  }

  return Array.from(mapByLawKey.values());
}

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

const VALID_SUFFIXES = ['ทวิ', 'ตรี', 'จัตวา', 'เบญจ', 'ฉอ', 'ฉ', 'สัปต', 'สัตต', 'อัฐ', 'อัฏฐ', 'อัฎฐ', 'นพ', 'นว', 'ทศ'];
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
      const canon = canonicalizeLaw(rawLawName);
      
      if (sections.length > 0) {
        results.push({ 
          lawName: rawLawName, 
          mappedName: canon.lawName,
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
  const normLaw = lawName.trim();
  const cleanSec = sectionNumber.trim();
  // First check exact match, e.g. "พระราชบัญญัติล้มละลาย:90/42 ทวิ"
  const exactKey = `${normLaw}:${cleanSec}`;
  if (categoryLookupCache.has(exactKey)) {
    return categoryLookupCache.get(exactKey)!;
  }

  // Also check normalized space
  const normSec = cleanSec.replace(/\s+/g, ' ');
  const normKey = `${normLaw}:${normSec}`;
  if (categoryLookupCache.has(normKey)) {
    return categoryLookupCache.get(normKey)!;
  }

  // Extract base number from section (e.g. "90/42 ทวิ" -> "90/42", "14/1" -> "14/1", "309 ทวิ" -> "309")
  const baseSectionMatch = cleanSec.match(/\d+(?:\/\d+)?/);
  const baseSection = baseSectionMatch ? baseSectionMatch[0] : cleanSec;
  
  const key = `${normLaw}:${baseSection}`;
  return categoryLookupCache.get(key) || `${normLaw} (มาตราทั่วไป / อื่นๆ)`;
}
