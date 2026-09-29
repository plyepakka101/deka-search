/**
 * Thai Legal Section Sorting Utility
 * Provides natural numerical ascending sort for Thai law section numbers
 * e.g. 1, 2, ..., 59, ..., 288, 288 ทวิ, 288 ตรี, 288/1, 288/2, 289
 */

const THAI_DIGITS_MAP: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
};

export function normalizeSectionText(s: string): string {
  if (!s) return '';
  let str = String(s).trim();
  // Replace Thai digits
  str = str.replace(/[๐-๙]/g, char => THAI_DIGITS_MAP[char] || char);
  // Remove prefix "มาตรา", "ม."
  str = str.replace(/^(มาตรา|ม\.)\s*/g, '');
  return str.trim();
}

export interface SectionComponents {
  main: number;
  suffixVal: number;
  sub: number;
  subSuffixVal: number;
  raw: string;
}

const SUFFIX_MAP: Array<{ key: string; val: number }> = [
  { key: 'ทวิ', val: 1 },
  { key: 'ตรี', val: 2 },
  { key: 'จัตวา', val: 3 },
  { key: 'เบญจ', val: 4 },
  { key: 'ฉ', val: 6 },
  { key: 'สัตต', val: 7 },
  { key: 'อัฏฐ', val: 8 },
  { key: 'นว', val: 9 },
  { key: 'ทศ', val: 10 }
];

export function parseSectionComponents(s: string): SectionComponents {
  const raw = normalizeSectionText(s);
  let clean = raw;
  let suffixVal = 0;
  let subSuffixVal = 0;
  let main = 0;
  let sub = 0;

  // Split by slash if any (e.g. 288/1)
  if (clean.includes('/')) {
    const parts = clean.split('/');
    let part0 = parts[0].trim();
    let part1 = parts.slice(1).join('/').trim();

    for (const suf of SUFFIX_MAP) {
      if (part0.includes(suf.key)) {
        suffixVal = suf.val;
        part0 = part0.replace(suf.key, '').trim();
        break;
      }
    }
    for (const suf of SUFFIX_MAP) {
      if (part1.includes(suf.key)) {
        subSuffixVal = suf.val;
        part1 = part1.replace(suf.key, '').trim();
        break;
      }
    }

    const p0 = parseFloat(part0);
    const p1 = parseFloat(part1);
    main = isNaN(p0) ? 0 : p0;
    sub = isNaN(p1) ? 0 : p1;
  } else {
    for (const suf of SUFFIX_MAP) {
      if (clean.includes(suf.key)) {
        suffixVal = suf.val;
        clean = clean.replace(suf.key, '').trim();
        break;
      }
    }
    const p = parseFloat(clean);
    main = isNaN(p) ? 0 : p;
  }

  return { main, suffixVal, sub, subSuffixVal, raw };
}

/**
 * Compare two section numbers ascending (1 -> 2 -> ... -> 59 -> ... -> 288 -> 288/1 -> 289)
 */
export function compareSectionNumbers(a: string, b: string): number {
  const valA = parseSectionComponents(a);
  const valB = parseSectionComponents(b);

  if (valA.main !== valB.main) {
    return valA.main - valB.main;
  }
  if (valA.suffixVal !== valB.suffixVal) {
    return valA.suffixVal - valB.suffixVal;
  }
  if (valA.sub !== valB.sub) {
    return valA.sub - valB.sub;
  }
  if (valA.subSuffixVal !== valB.subSuffixVal) {
    return valA.subSuffixVal - valB.subSuffixVal;
  }
  return valA.raw.localeCompare(valB.raw, 'th');
}

export const BOOK_PRIORITY_ORDER: Record<string, number> = {
  'crim': 1,
  'civil': 2,
  'crim_proc': 3,
  'civil_proc': 4,
  'const': 5,
  'bankruptcy': 6,
  'kwaeng': 7,
  'court_const': 8,
};

/**
 * Sorts an array of items by section number ascending (and optionally book priority)
 */
export function sortSectionsAscending<T>(
  items: T[],
  getSectionStr: (item: T) => string | undefined | null,
  getBookId?: (item: T) => string | undefined | null
): T[] {
  return [...items].sort((a, b) => {
    if (getBookId) {
      const bookA = getBookId(a) || '';
      const bookB = getBookId(b) || '';
      if (bookA !== bookB) {
        const priorityA = BOOK_PRIORITY_ORDER[bookA] ?? 99;
        const priorityB = BOOK_PRIORITY_ORDER[bookB] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return bookA.localeCompare(bookB, 'th');
      }
    }

    const secA = getSectionStr(a) || '';
    const secB = getSectionStr(b) || '';
    return compareSectionNumbers(secA, secB);
  });
}
