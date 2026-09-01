
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
  TOC = 'TOC'
}

export interface BackupData {
  version: number;
  timestamp: number;
  notes: Record<string, UserNote>;
  customLaws: LawSection[];
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