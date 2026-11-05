import titlesData from '@/data/lawTitles.json';

const titles: Record<string, string> = titlesData;

function normalizeBookKey(bookIdOrName: string): string {
  if (!bookIdOrName) return '';
  const s = bookIdOrName.toLowerCase();

  // Criminal
  if (s.includes('crim') || s.includes('อาญา')) {
    return s.includes('proc') || s.includes('วิ') ? 'criminal_proc' : 'criminal';
  }
  // Civil
  if (s.includes('civil') || s.includes('แพ่ง') || s.includes('pp')) {
    return s.includes('proc') || s.includes('วิ') ? 'civil_proc' : 'pppp';
  }
  // Bankruptcy
  if (s.includes('bank') || s.includes('ล้ม')) return 'bankruptcy';
  // Constitution
  if (s.includes('const') || s.includes('รัฐ')) return 'constitution';
  // Labour
  if (s.includes('lab') || s.includes('แรงงาน')) return 'labour_protection';
  // Revenue
  if (s.includes('rev') || s.includes('รัษ')) return 'revenue';
  // Administrative Court
  if (s.includes('admin') || s.includes('ปกครอง')) return 'admin_court';
  // Court Organization
  if (s.includes('court_org') || s.includes('พระธรรมนูญ')) return 'court_org';
  // District Court
  if (s.includes('district') || s.includes('แขวง')) return 'district_court';
  // Juvenile Court
  if (s.includes('juvenile') || s.includes('เยาวชน')) return 'juvenile_court';
  // Consumer
  if (s.includes('consumer') || s.includes('ผู้บริโภค')) return 'consumer_proc';
  // Copyright
  if (s.includes('copyright') || s.includes('ลิขสิทธิ์')) return 'copyright';

  return s;
}

/**
 * Returns the short title / description for a given section.
 * Example:
 * getSectionTitle('criminal', '288') => "ฆ่าผู้อื่น"
 * getSectionTitle('civil', '420') => "หลักละเมิดและความรับผิดใช้ค่าสินไหม"
 * getSectionTitle('bankruptcy', '90/1') => "ในหมวดนี้ เว้นแต่ข้อความจะแสดงให้เห็นเป็นอย่างอื่น"
 */
export function getSectionTitle(bookIdOrName: string, sectionNumber: string): string | undefined {
  if (!bookIdOrName || !sectionNumber) return undefined;
  const b = normalizeBookKey(bookIdOrName);
  const n = String(sectionNumber).trim();

  return (
    titles[`${b}:${n}`] ||
    titles[`${b}:${n.replace(/-/g, '/')}`] ||
    titles[`${b}:${n.replace(/\//g, '-')}`]
  );
}
