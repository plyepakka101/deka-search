import { LawSection, UserNote, BackupData, AppSettings, LawBook } from '../types';
import { parseLaws } from './lawParser';
import { thaiToArabic } from '../utils/textUtils';

let cachedBooks: LawBook[] = [];
let cachedLaws: LawSection[] = [];

export const initLawsData = async () => {
  if (cachedBooks.length > 0) return;
  const res = await fetch('/api/laws/books?includeContent=true');
  cachedBooks = await res.json();
  cachedLaws = cachedBooks.flatMap(book => parseLaws(book.content, book.id, book.name));
};

const CUSTOM_LAWS_KEY = 'thai_law_mate_custom_laws';
const NOTES_KEY = 'thai_law_mate_notes';
const SETTINGS_KEY = 'thai_law_mate_settings';

export const getBooks = (): LawBook[] => cachedBooks;

export const getOriginalLaw = (id: string): LawSection | undefined => {
  return cachedLaws.find(l => l.id === id);
};

export const getLaws = (): LawSection[] => {
  if (typeof window === 'undefined') return [];
  
  const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
  const customLaws: LawSection[] = storedCustom ? JSON.parse(storedCustom) : [];
  
  const lawMap = new Map<string, LawSection>();
  
  cachedLaws.forEach(law => lawMap.set(law.id, law));
  customLaws.forEach(law => lawMap.set(law.id, law));

  const allLaws = Array.from(lawMap.values());

  const parseSectionComponents = (s: string) => {
      let clean = thaiToArabic(s).trim();
      let main = 0;
      let sub = 0;
      let suffixVal = 0;

      const suffixes = [
        { key: 'ทวิ', val: 1 }, { key: 'ตรี', val: 2 }, { key: 'จัตวา', val: 3 },
        { key: 'เบญจ', val: 4 }, { key: 'ฉ', val: 6 }, { key: 'สัตต', val: 7 },
        { key: 'อัฏฐ', val: 8 }, { key: 'นว', val: 9 }, { key: 'ทศ', val: 10 }
      ];

      for (const suf of suffixes) {
          if (clean.includes(suf.key)) {
              suffixVal = suf.val;
              clean = clean.replace(suf.key, '').trim();
              break;
          }
      }

      if (clean.includes('/')) {
          const parts = clean.split('/');
          const p0 = parseFloat(parts[0]);
          const p1 = parseFloat(parts[1]);
          main = isNaN(p0) ? 0 : p0;
          sub = isNaN(p1) ? 0 : p1;
      } else {
          const p = parseFloat(clean);
          main = isNaN(p) ? 0 : p;
      }
      
      return { main, sub, suffixVal };
  };

  return allLaws.sort((a, b) => {
      const bookIndexA = cachedBooks.findIndex(book => book.id === a.bookId);
      const bookIndexB = cachedBooks.findIndex(book => book.id === b.bookId);
      
      const idxA = bookIndexA === -1 ? 99 : bookIndexA;
      const idxB = bookIndexB === -1 ? 99 : bookIndexB;

      if (idxA !== idxB) {
          return idxA - idxB;
      }
      
      if (a.isCustom && !a.bookId) return 1;
      if (b.isCustom && !b.bookId) return -1;

      const valA = parseSectionComponents(a.sectionNumber);
      const valB = parseSectionComponents(b.sectionNumber);

      if (valA.main !== valB.main) {
          return valA.main - valB.main;
      }
      if (valA.suffixVal !== valB.suffixVal) {
          return valA.suffixVal - valB.suffixVal;
      }
      return valA.sub - valB.sub;
  });
};

export const saveCustomLaw = (law: LawSection | Omit<LawSection, 'id'>) => {
  if (typeof window === 'undefined') return law as LawSection;
  const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
  let customLaws: LawSection[] = storedCustom ? JSON.parse(storedCustom) : [];
  
  let newLaw: LawSection;
  const normalizedSection = thaiToArabic(law.sectionNumber);
  
  let existingId = 'id' in law ? law.id : undefined;
  
  if (!existingId && law.bookId && law.bookId !== 'custom') {
      const targetId = `${law.bookId}-${normalizedSection.replace(/\//g, '-').replace(/\s+/g, '-')}`;
      const builtIn = cachedLaws.find(l => l.id === targetId);
      if (builtIn) {
          existingId = builtIn.id;
      } else {
          existingId = targetId;
      }
  }

  if (existingId) {
    newLaw = { 
        ...law, 
        sectionNumber: normalizedSection,
        id: existingId, 
        isCustom: true 
    }; 
    const index = customLaws.findIndex(l => l.id === existingId);
    if (index >= 0) {
      customLaws[index] = newLaw;
    } else {
      customLaws.push(newLaw);
    }
  } else {
    newLaw = {
      ...law,
      sectionNumber: normalizedSection, 
      id: `custom-${Date.now()}`,
      category: law.category || 'กฎหมายเพิ่มเติม',
      isCustom: true,
      bookId: law.bookId || 'custom' 
    };
    customLaws.push(newLaw);
  }
  
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(customLaws));
  return newLaw;
};

export const restoreOriginalLaw = (id: string) => {
    if (typeof window === 'undefined') return;
    const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
    if(!storedCustom) return;
    const customLaws: LawSection[] = JSON.parse(storedCustom);
    const updated = customLaws.filter(l => l.id !== id);
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(updated));
}

export const getNotes = (): Record<string, UserNote> => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(NOTES_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const saveNote = (note: UserNote) => {
  if (typeof window === 'undefined') return {};
  const notes = getNotes();
  
  const hasText = note.text && note.text.trim().length > 0;
  const hasHighlight = note.isHighlighted;
  const hasTextHighlights = note.textHighlights && note.textHighlights.length > 0;

  if (!hasText && !hasHighlight && !hasTextHighlights) {
    delete notes[note.sectionId];
  } else {
    notes[note.sectionId] = note;
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return notes;
};

export const deleteCustomLaw = (id: string) => {
    restoreOriginalLaw(id);
}

export const exportData = (): string => {
  const notes = getNotes();
  const storedCustom = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_LAWS_KEY) : null;
  const customLaws = storedCustom ? JSON.parse(storedCustom) : [];

  const backup: BackupData = {
    version: 1,
    timestamp: Date.now(),
    notes,
    customLaws
  };

  return JSON.stringify(backup, null, 2);
};

export const importData = (jsonString: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const data: BackupData = JSON.parse(jsonString);
    if (!data.notes || !Array.isArray(data.customLaws)) {
      console.error("Invalid backup format");
      return false;
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(data.customLaws));
    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
};

export const resetData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CUSTOM_LAWS_KEY);
};

export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') return { darkMode: false, fontSize: 2, fontStyle: 'modern', lineHeight: 1.8, voiceURI: '', speakingRate: 1.0 };
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    darkMode: false,
    fontSize: 2,
    fontStyle: 'modern',
    lineHeight: 1.8,
    voiceURI: '',
    speakingRate: 1.0
  };
};

export const saveSettings = (settings: AppSettings) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
