import { LawSection, UserNote, BackupData, AppSettings, LawBook, ExportOptions, MemorizationDeck, MemorizationItem, MemorizationStats } from '../types';
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
const CUSTOM_BOOKS_KEY = 'thai_law_mate_custom_books';
const NOTES_KEY = 'thai_law_mate_notes';
const SETTINGS_KEY = 'thai_law_mate_settings';
const MEMO_DECKS_KEY = 'thai_law_mate_memo_decks';
const MEMO_ITEMS_KEY = 'thai_law_mate_memo_items';
const MEMO_STATS_KEY = 'thai_law_mate_memo_stats';
const DEKA_BOOKMARKS_KEY = 'deka_bookmarks';

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

const EXAM_ATTEMPTS_KEY = 'deka_exam_attempts';
const EXAM_REVIEWS_KEY = 'deka_exam_reviews';

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeNotes: true,
  includeCustomLaws: true,
  includeMemorization: true,
  includeBookmarks: true,
  includeExamHistory: true,
  includeSettings: true,
};

export const exportData = (options: Partial<ExportOptions> = DEFAULT_EXPORT_OPTIONS): string => {
  const opts: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  
  const backup: BackupData = {
    version: 2,
    timestamp: Date.now(),
  };

  if (opts.includeNotes) {
    backup.notes = getNotes();
  }

  if (opts.includeCustomLaws && typeof window !== 'undefined') {
    const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
    backup.customLaws = storedCustom ? JSON.parse(storedCustom) : [];

    const storedCustomBooks = localStorage.getItem(CUSTOM_BOOKS_KEY);
    if (storedCustomBooks) {
      backup.customBooks = JSON.parse(storedCustomBooks);
    }
  }

  if (opts.includeMemorization && typeof window !== 'undefined') {
    const decks = localStorage.getItem(MEMO_DECKS_KEY);
    const items = localStorage.getItem(MEMO_ITEMS_KEY);
    const stats = localStorage.getItem(MEMO_STATS_KEY);
    if (decks) backup.memoDecks = JSON.parse(decks);
    if (items) backup.memoItems = JSON.parse(items);
    if (stats) backup.memoStats = JSON.parse(stats);
  }

  if (opts.includeBookmarks && typeof window !== 'undefined') {
    const bookmarks = localStorage.getItem(DEKA_BOOKMARKS_KEY);
    if (bookmarks) backup.bookmarks = JSON.parse(bookmarks);
  }

  if (opts.includeExamHistory && typeof window !== 'undefined') {
    const attempts = localStorage.getItem(EXAM_ATTEMPTS_KEY);
    const reviews = localStorage.getItem(EXAM_REVIEWS_KEY);
    if (attempts) backup.examAttempts = JSON.parse(attempts);
    if (reviews) backup.examReviews = JSON.parse(reviews);
  }

  if (opts.includeSettings) {
    backup.settings = getSettings();
  }

  return JSON.stringify(backup, null, 2);
};

export interface ImportSummary {
  notesCount: number;
  starredCount: number;
  linkedDekaCount: number;
  customLawsCount: number;
  customBooksCount: number;
  memoDecksCount: number;
  memoItemsCount: number;
  bookmarksCount: number;
  examAttemptsCount: number;
  examReviewsCount: number;
  hasSettings: boolean;
}

export const inspectBackupData = (jsonString: string): { valid: boolean; summary?: ImportSummary; error?: string } => {
  try {
    const data: BackupData = JSON.parse(jsonString);
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' };
    }

    let notesCount = 0;
    let starredCount = 0;
    let linkedDekaCount = 0;
    if (data.notes && typeof data.notes === 'object') {
      notesCount = Object.keys(data.notes).length;
      Object.values(data.notes).forEach(n => {
        if (n.isHighlighted) starredCount++;
        if (n.linkedDekaIds && n.linkedDekaIds.length > 0) linkedDekaCount += n.linkedDekaIds.length;
      });
    }

    const summary: ImportSummary = {
      notesCount,
      starredCount,
      linkedDekaCount,
      customLawsCount: Array.isArray(data.customLaws) ? data.customLaws.length : 0,
      customBooksCount: Array.isArray(data.customBooks) ? data.customBooks.length : 0,
      memoDecksCount: Array.isArray(data.memoDecks) ? data.memoDecks.length : 0,
      memoItemsCount: Array.isArray(data.memoItems) ? data.memoItems.length : 0,
      bookmarksCount: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
      examAttemptsCount: Array.isArray(data.examAttempts) ? data.examAttempts.length : 0,
      examReviewsCount: Array.isArray(data.examReviews) ? data.examReviews.length : 0,
      hasSettings: Boolean(data.settings)
    };

    return { valid: true, summary };
  } catch (e) {
    return { valid: false, error: 'ไม่สามารถอ่านไฟล์ JSON ได้' };
  }
};

export const importData = (jsonString: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const data: BackupData = JSON.parse(jsonString);
    if (typeof data !== 'object' || data === null) {
      console.error("Invalid backup format");
      return false;
    }

    // 1. Restore Notes & Highlights & Starred & Linked Deka
    if (data.notes && typeof data.notes === 'object') {
      const existing = getNotes();
      const merged = { ...existing, ...data.notes };
      localStorage.setItem(NOTES_KEY, JSON.stringify(merged));
    }

    // 2. Restore Custom Laws & Custom Books
    if (Array.isArray(data.customLaws)) {
      const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
      const existingCustom: LawSection[] = storedCustom ? JSON.parse(storedCustom) : [];
      const lawMap = new Map<string, LawSection>();
      existingCustom.forEach(l => lawMap.set(l.id, l));
      data.customLaws.forEach(l => lawMap.set(l.id, l));
      localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(Array.from(lawMap.values())));
    }

    if (Array.isArray(data.customBooks)) {
      localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(data.customBooks));
    }

    // 3. Restore Memorization Decks & Items & Stats
    if (Array.isArray(data.memoDecks)) {
      localStorage.setItem(MEMO_DECKS_KEY, JSON.stringify(data.memoDecks));
    }

    if (Array.isArray(data.memoItems)) {
      const storedItems = localStorage.getItem(MEMO_ITEMS_KEY);
      const existingItems: MemorizationItem[] = storedItems ? JSON.parse(storedItems) : [];
      const itemMap = new Map<string, MemorizationItem>();
      existingItems.forEach(i => itemMap.set(i.id, i));
      data.memoItems.forEach(i => itemMap.set(i.id, i));
      localStorage.setItem(MEMO_ITEMS_KEY, JSON.stringify(Array.from(itemMap.values())));
    }

    if (data.memoStats) {
      localStorage.setItem(MEMO_STATS_KEY, JSON.stringify(data.memoStats));
    }

    // 4. Restore Deka Bookmarks
    if (Array.isArray(data.bookmarks)) {
      const storedBookmarks = localStorage.getItem(DEKA_BOOKMARKS_KEY);
      const existingBookmarks: any[] = storedBookmarks ? JSON.parse(storedBookmarks) : [];
      const bookmarkMap = new Map<string, any>();
      existingBookmarks.forEach(b => bookmarkMap.set(b.id, b));
      data.bookmarks.forEach(b => bookmarkMap.set(b.id, b));
      localStorage.setItem(DEKA_BOOKMARKS_KEY, JSON.stringify(Array.from(bookmarkMap.values())));
    }

    // 5. Restore Exam Attempts & Reviews
    if (Array.isArray(data.examAttempts)) {
      const storedAttempts = localStorage.getItem(EXAM_ATTEMPTS_KEY);
      const existingAttempts: any[] = storedAttempts ? JSON.parse(storedAttempts) : [];
      const attemptMap = new Map<string, any>();
      existingAttempts.forEach(a => attemptMap.set(a.id, a));
      data.examAttempts.forEach(a => attemptMap.set(a.id, a));
      localStorage.setItem(EXAM_ATTEMPTS_KEY, JSON.stringify(Array.from(attemptMap.values())));
    }

    if (Array.isArray(data.examReviews)) {
      const storedReviews = localStorage.getItem(EXAM_REVIEWS_KEY);
      const existingReviews: any[] = storedReviews ? JSON.parse(storedReviews) : [];
      const reviewMap = new Map<string, any>();
      existingReviews.forEach(r => reviewMap.set(r.questionId, r));
      data.examReviews.forEach(r => reviewMap.set(r.questionId, r));
      localStorage.setItem(EXAM_REVIEWS_KEY, JSON.stringify(Array.from(reviewMap.values())));
    }

    // 6. Restore Settings
    if (data.settings && typeof data.settings === 'object') {
      saveSettings(data.settings);
    }

    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
};

export const resetData = (options?: { resetNotes?: boolean; resetLaws?: boolean; resetMemo?: boolean; resetBookmarks?: boolean; resetExamHistory?: boolean; resetSettings?: boolean }) => {
  if (typeof window === 'undefined') return;
  const opts = options || { resetNotes: true, resetLaws: true, resetMemo: true, resetBookmarks: true, resetExamHistory: true, resetSettings: true };
  if (opts.resetNotes) localStorage.removeItem(NOTES_KEY);
  if (opts.resetLaws) {
    localStorage.removeItem(CUSTOM_LAWS_KEY);
    localStorage.removeItem(CUSTOM_BOOKS_KEY);
  }
  if (opts.resetMemo) {
    localStorage.removeItem(MEMO_DECKS_KEY);
    localStorage.removeItem(MEMO_ITEMS_KEY);
    localStorage.removeItem(MEMO_STATS_KEY);
  }
  if (opts.resetBookmarks) localStorage.removeItem(DEKA_BOOKMARKS_KEY);
  if (opts.resetExamHistory) {
    localStorage.removeItem(EXAM_ATTEMPTS_KEY);
    localStorage.removeItem(EXAM_REVIEWS_KEY);
  }
  if (opts.resetSettings) localStorage.removeItem(SETTINGS_KEY);
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
