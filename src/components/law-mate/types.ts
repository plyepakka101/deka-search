
export interface LawSection {
  id: string;
  sectionNumber: string; // e.g., "1", "288"
  content: string;
  category?: string; // e.g., "ประมวลกฎหมายอาญา > ภาค 1 บทบัญญัติทั่วไป"
  isCustom?: boolean;
  bookId?: string; // e.g., 'crim', 'civil'
  sourceUrl?: string; // Override book's source URL
}

export interface TextHighlight {
  start: number;
  end: number;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'red';
}

export interface UserNote {
  sectionId: string;
  text: string;
  updatedAt: number;
  isHighlighted?: boolean;
  textHighlights?: TextHighlight[];
  linkedDekaIds?: string[];
}

export interface SearchFilters {
  query: string;
  onlyNotes: boolean;
}

export enum ViewState {
  BOOKSHELF = 'BOOKSHELF',
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  NOTES = 'NOTES',
  HIGHLIGHTS = 'HIGHLIGHTS',
  ADD = 'ADD',
  SETTINGS = 'SETTINGS',
  TOC = 'TOC',
  MEMORIZE = 'MEMORIZE'
}

// -------------------------------------------------------------
// Legal Memorization System Types
// -------------------------------------------------------------

export type MemorizeStudyMode = 'read' | 'recall' | 'cloze' | 'voice';

export interface ParagraphSlice {
  index: number;
  label: string; // e.g. "วรรคหนึ่ง", "วรรคสอง"
  content: string;
}

export interface MemorizationDeck {
  id: string;
  name: string;
  description?: string;
  color: string;
  isBuiltin?: boolean;
  sortOrder?: number;
  totalItems?: number;
  dueItems?: number;
  masteredItems?: number;
}

export interface MemorizationItem {
  id: string;
  deckId: string;
  sectionId: string;
  title?: string;
  customText?: string;
  keywords?: string[];
  audioUrl?: string;
  
  // Section details joined from law_sections
  sectionNumber?: string;
  content?: string;
  bookId?: string;
  
  // SRS state
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  lastQuality?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface MemorizationStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

export interface BackupData {
  version: number;
  timestamp: number;
  notes?: Record<string, UserNote>;
  customLaws?: LawSection[];
  customBooks?: LawBook[];
  memoDecks?: MemorizationDeck[];
  memoItems?: MemorizationItem[];
  memoStats?: MemorizationStats;
  bookmarks?: any[];
  examAttempts?: any[];
  examReviews?: any[];
  settings?: AppSettings;
}

export interface ExportOptions {
  includeNotes: boolean;
  includeCustomLaws: boolean;
  includeMemorization: boolean;
  includeBookmarks: boolean;
  includeExamHistory?: boolean;
  includeSettings: boolean;
}

export type FontStyle = 'modern' | 'traditional';

export interface AppSettings {
  darkMode: boolean;
  fontSize: number; // 1-5
  fontStyle: FontStyle;
  lineHeight?: number; // 1.5, 1.8, 2.0
  voiceURI?: string;
  speakingRate?: number;
}

export interface LawBook {
  id: string;
  name: string;
  content: string;
  abbreviation: string;
  description?: string;
  color: string; // Tailwind color class pattern
  sourceUrl?: string;
  lastUpdated?: string;
}