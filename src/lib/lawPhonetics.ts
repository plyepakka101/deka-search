// Law Phonetic Preprocessor for TTS Engines (Azure, Edge, Google, Browser)
// Normalizes Thai legal terms, section fractions, subsection markers, and abbreviations
// so that speech synthesis engines pronounce them naturally and accurately.

export interface PhoneticOptions {
  /** If true, uses "อนุ 1" instead of "อนุมาตรา 1" (faster recitation) */
  useShortAnu?: boolean;
}

const SECTION_SLASH_REGEX = /(\d+(?:\s*[฀-๿]+)?)\/(\d+)/g;
const SECTION_CHA_REGEX = /(\d+)\s*ฉ(?=[\s,]|$)/g;
const SUBSECTION_REGEX = /(?:^|\n|\s)\(([0-9๐-๙]+)\)/g;

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

  // 5. Common Legal Abbreviations -> Full spoken words
  s = s.replace(/พ\.ร\.บ\./g, 'พระราชบัญญัติ');
  s = s.replace(/พ\.ร\.ก\./g, 'พระราชกำหนด');
  s = s.replace(/ป\.อ\./g, 'ประมวลกฎหมายอาญา');
  s = s.replace(/ป\.พ\.พ\./g, 'ประมวลกฎหมายแพ่งและพาณิชย์');
  s = s.replace(/ป\.วิ\.อ\./g, 'ประมวลกฎหมายวิธีพิจารณาความอาญา');
  s = s.replace(/ป\.วิ\.พ\./g, 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง');
  s = s.replace(/รธน\./g, 'รัฐธรรมนูญ');

  // 6. Deka citation: "ฎีกาที่ 123/2560" -> "คำพิพากษาศาลฎีกาที่ 123 ทับ 2560"
  s = s.replace(/ฎีกาที่\s*([0-9๐-๙]+)\/([0-9๐-๙]+)/g, 'คำพิพากษาศาลฎีกาที่ $1 ทับ $2');

  // 7. Strip quotation marks that cause TTS to read "เครื่องหมายคำพูด" or stutter
  s = s.replace(/[“”"']/g, ' ');

  // 8. Normalize whitespace and clean up
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n\s+/g, '\n');

  return s.trim();
}
