// Law Phonetic Preprocessor for TTS Engines (Azure, Edge, Google, Browser)
// Normalizes Thai legal terms, section fractions, subsection markers, abbreviations,
// and repeats words before maiyamok ("ๆ") so TTS engines pronounce them naturally and accurately.

export interface PhoneticOptions {
  /** If true, uses "อนุ 1" instead of "อนุมาตรา 1" (faster recitation) */
  useShortAnu?: boolean;
}

const SECTION_SLASH_REGEX = /([0-9๐-๙]+(?:\s*[฀-๿]+)?)\/([0-9๐-๙]+)/g;
const SECTION_CHA_REGEX = /([0-9๐-๙]+)\s*ฉ(?=[\s,]|$)/g;

// Subsections with numbers or fractions: (๑), (1), ( ๑ ), (๑/๑), (1/1)
const SUBSECTION_NUM_REGEX = /(?:^|[\s\n\r,;(])\(\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)\s*\)/g;

// Subsections with Thai consonants: (ก), (ข), (ค)
const SUBSECTION_ALPHA_REGEX = /(?:^|[\s\n\r,;(])\(\s*([ก-ฮ])\s*\)/g;

// Line-start numbering with period: "1. ", "๑. "
const LINE_START_NUM_REGEX = /(?:^|\n)\s*([0-9๐-๙]+)\.\s+/g;

const THAI_DIGIT_MAP: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

export function thaiToArabicDigits(str: string): string {
  if (!str) return '';
  return str.replace(/[๐-๙]/g, ch => THAI_DIGIT_MAP[ch] || ch);
}

// Common Thai base words that are reduplicated by maiyamok in legal texts (sorted longest to shortest)
const REPEATABLE_WORDS = [
  'อย่างหนึ่งอย่างใด', 'อย่างใด',
  'อื่น', 'ใด', 'ต่าง', 'นั้น', 'นี้', 'โน้น', 'หนึ่ง', 'สอง', 'สาม',
  'จริง', 'บ่อย', 'นาน', 'ทุก', 'แน่', 'แท้', 'มาก', 'น้อย', 'ช้า', 'เร็ว',
  'ค่อย', 'ใกล้', 'ไกล', 'ซ้ำ', 'ซ้อน', 'แรก', 'หลัง', 'หน้า', 'บน', 'ล่าง',
  'นอก', 'ใน', 'ข้าง', 'ตรง', 'หมด', 'นิด', 'เพียง', 'ชัด', 'เฉย', 'ครบ',
  'รอบ', 'ชั้น', 'ช่วง', 'ข้อ', 'ส่วน', 'พวก', 'คราว', 'ทั่ว'
];

/**
 * Normalizes legal text for Thai Text-to-Speech synthesis.
 */
export function normalizeLawTextForTTS(text: string, options: PhoneticOptions = {}): string {
  if (!text) return '';

  const anuPrefix = options.useShortAnu ? 'อนุ' : 'อนุมาตรา';

  let s = String(text);

  // 1. Phonetic fixes for known legal words that TTS mispronounces
  s = s.replace(/ลหุโทษ/g, 'ละหุโทด');

  // 2. Section number fractions: "มาตรา 90/1", "มาตรา ๗/๑" -> "มาตรา 90 ทับ 1"
  s = s.replace(SECTION_SLASH_REGEX, (m, p1, p2) => `${thaiToArabicDigits(p1)} ทับ ${thaiToArabicDigits(p2)}`);

  // 3. Section sub-letters: "มาตรา 106 ฉ", "มาตรา ๑๐๖ ฉ" -> "มาตรา 106 ฉะ"
  s = s.replace(SECTION_CHA_REGEX, (m, p1) => `${thaiToArabicDigits(p1)} ฉะ`);

  // 4. Subsections / Paragraphs: "(1)", "(๑)", "( ๑ )", "(๑/๑)" -> "อนุมาตรา 1", "อนุมาตรา 1 ทับ 1"
  s = s.replace(SUBSECTION_NUM_REGEX, (match, rawNum) => {
    const prefix = match.startsWith('(') ? '' : match[0];
    const numArabic = thaiToArabicDigits(rawNum).replace('/', ' ทับ ');
    return `${prefix} ${anuPrefix} ${numArabic} `;
  });

  // 4b. Sub-clauses with Thai letters: "(ก)", "(ข)" -> "อนุ ก", "อนุ ข"
  s = s.replace(SUBSECTION_ALPHA_REGEX, (match, letter) => {
    const prefix = match.startsWith('(') ? '' : match[0];
    return `${prefix} อนุ ${letter} `;
  });

  // 4c. Line-start numbered lists: "1. ", "๑. " -> "อนุมาตรา 1 "
  s = s.replace(LINE_START_NUM_REGEX, (match, rawNum) => {
    const numArabic = thaiToArabicDigits(rawNum);
    return `\n${anuPrefix} ${numArabic} `;
  });

  // 5. Maiyamok ("ๆ") handling:
  // Converts e.g. "ใด ๆ" -> "ใด ใด", "อื่น ๆ" -> "อื่น อื่น", "ต่าง ๆ" -> "ต่าง ต่าง"
  // and eliminates orphan 'ๆ' so TTS never speaks the literal word "ไม้ยมก"
  s = s.replace(/([^\s]+)\s*ๆ/g, (match, prefix) => {
    for (const w of REPEATABLE_WORDS) {
      if (prefix.endsWith(w)) {
        return `${prefix} ${w}`;
      }
    }
    if (prefix.length <= 4) {
      return `${prefix} ${prefix}`;
    }
    return `${prefix} ${prefix}`;
  });
  // Safety: remove any orphan 'ๆ' that may still remain
  s = s.replace(/ๆ/g, '');

  // 6. Common Legal Abbreviations -> Full spoken words
  s = s.replace(/พ\.ร\.บ\./g, 'พระราชบัญญัติ');
  s = s.replace(/พ\.ร\.ก\./g, 'พระราชกำหนด');
  s = s.replace(/ป\.อ\./g, 'ประมวลกฎหมายอาญา');
  s = s.replace(/ป\.พ\.พ\./g, 'ประมวลกฎหมายแพ่งและพาณิชย์');
  s = s.replace(/ป\.วิ\.อ\./g, 'ประมวลกฎหมายวิธีพิจารณาความอาญา');
  s = s.replace(/ป\.วิ\.พ\./g, 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง');
  s = s.replace(/รธน\./g, 'รัฐธรรมนูญ');

  // 7. Deka citation: "ฎีกาที่ 123/2560" -> "คำพิพากษาศาลฎีกาที่ 123 ทับ 2560"
  s = s.replace(/ฎีกาที่\s*([0-9๐-๙]+)\/([0-9๐-๙]+)/g, (m, p1, p2) => 
    `คำพิพากษาศาลฎีกาที่ ${thaiToArabicDigits(p1)} ทับ ${thaiToArabicDigits(p2)}`
  );

  // 8. Strip quotation marks that cause TTS to read "เครื่องหมายคำพูด" or stutter
  s = s.replace(/[“”"']/g, ' ');

  // 9. Convert remaining Thai numerals to Arabic digits for 100% TTS compatibility
  s = thaiToArabicDigits(s);

  // 10. Normalize whitespace and clean up
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n\s+/g, '\n');

  return s.trim();
}
