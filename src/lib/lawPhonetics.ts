// Law Phonetic Preprocessor for TTS Engines (Azure, Edge, Google, Browser)
// Normalizes Thai legal terms, section fractions, subsection markers, abbreviations,
// and repeats words before maiyamok ("ๆ") so TTS engines pronounce them naturally and accurately.

export interface PhoneticOptions {
  /** If true, uses "อนุ 1" instead of "อนุมาตรา 1" (faster recitation) */
  useShortAnu?: boolean;
}

const SECTION_SLASH_REGEX = /(\d+(?:\s*[฀-๿]+)?)\/(\d+)/g;
const SECTION_CHA_REGEX = /(\d+)\s*ฉ(?=[\s,]|$)/g;
const SUBSECTION_REGEX = /(?:^|\n|\s)\(([0-9๐-๙]+)\)/g;

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

  // 2. Section number fractions: "มาตรา 90/1" -> "มาตรา 90 ทับ 1"
  s = s.replace(SECTION_SLASH_REGEX, '$1 ทับ $2');

  // 3. Section sub-letters: "มาตรา 106 ฉ" -> "มาตรา 106 ฉะ"
  s = s.replace(SECTION_CHA_REGEX, '$1 ฉะ');

  // 4. Subsections / Paragraphs: "(1)" -> "อนุมาตรา 1"
  s = s.replace(SUBSECTION_REGEX, (match, num) => {
    return ` ${anuPrefix} ${num} `;
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
  s = s.replace(/ฎีกาที่\s*([0-9๐-๙]+)\/([0-9๐-๙]+)/g, 'คำพิพากษาศาลฎีกาที่ $1 ทับ $2');

  // 8. Strip quotation marks that cause TTS to read "เครื่องหมายคำพูด" or stutter
  s = s.replace(/[“”"']/g, ' ');

  // 9. Normalize whitespace and clean up
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n\s+/g, '\n');

  return s.trim();
}
