import { MemorizationDeck, MemorizationItem, MemorizationStats } from '../types';
import { calculateNextSRS, ReviewRating } from './srsEngine';
import { getLaws } from './dataService';

const MEMO_DECKS_KEY = 'thai_law_mate_memo_decks';
const MEMO_ITEMS_KEY = 'thai_law_mate_memo_items';
const MEMO_STATS_KEY = 'thai_law_mate_memo_stats';

// Built-in starter decks per Law Book
export const BUILTIN_DECKS: MemorizationDeck[] = [
  {
    id: 'deck-crim',
    name: 'ประมวลกฎหมายอาญา (ป.อ.)',
    description: 'ความผิดและโทษทางอาญา ภาค 1-3 (ม. 59, 68, 80, 83, 288, 334)',
    color: 'bg-red-500',
    sortOrder: 1,
    isBuiltin: true
  },
  {
    id: 'deck-civil',
    name: 'ประมวลกฎหมายแพ่งและพาณิชย์ (ป.พ.พ.)',
    description: 'นิติกรรม สัญญา หนี้ ละเมิด ทรัพย์สิน ครอบครัว มรดก (ม. 149, 150, 420, 213)',
    color: 'bg-blue-500',
    sortOrder: 2,
    isBuiltin: true
  },
  {
    id: 'deck-crim_proc',
    name: 'ประมวลกฎหมายวิธีพิจารณาความอาญา (ป.วิ.อ.)',
    description: 'กระบวนพิจารณาคดีอาญา ผู้เสียหาย อำนาจสอบสวน ฟ้องคดี (ม. 2(4), 28, 39, 158)',
    color: 'bg-orange-600',
    sortOrder: 3,
    isBuiltin: true
  },
  {
    id: 'deck-civil_proc',
    name: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง (ป.วิ.พ.)',
    description: 'กระบวนพิจารณาคดีแพ่ง อำนาจฟ้อง คำคู่ความ การดำเนินกระบวนพิจารณา',
    color: 'bg-indigo-500',
    sortOrder: 4,
    isBuiltin: true
  },
  {
    id: 'deck-const',
    name: 'รัฐธรรมนูญแห่งราชอาณาจักรไทย (รธน.)',
    description: 'กฎหมายสูงสุดของประเทศ สิทธิเสรีภาพ รัฐสภา ศาล',
    color: 'bg-yellow-500',
    sortOrder: 5,
    isBuiltin: true
  },
  {
    id: 'deck-bankruptcy',
    name: 'พระราชบัญญัติล้มละลาย',
    description: 'กระบวนการล้มละลายและการฟื้นฟูกิจการของลูกหนี้',
    color: 'bg-emerald-600',
    sortOrder: 6,
    isBuiltin: true
  },
  {
    id: 'deck-kwaeng',
    name: 'พ.ร.บ. จัดตั้งศาลแขวงฯ',
    description: 'กระบวนพิจารณาคดีอาญาในศาลแขวงและอำนาจศาล',
    color: 'bg-teal-500',
    sortOrder: 7,
    isBuiltin: true
  },
  {
    id: 'deck-court_const',
    name: 'พระธรรมนูญศาลยุติธรรม',
    description: 'เขตอำนาจศาลและองค์คณะผู้พิพากษา',
    color: 'bg-slate-600',
    sortOrder: 8,
    isBuiltin: true
  }
];

// Starter sections for immediate high-yield practice
const STARTER_ITEMS: Array<{ deckId: string; sectionId: string; title: string }> = [
  { deckId: 'deck-crim', sectionId: 'crim-59', title: 'มาตรา 59 - เจตนาและประมาท' },
  { deckId: 'deck-crim', sectionId: 'crim-60', title: 'มาตรา 60 - การกระทำโดยพลาด' },
  { deckId: 'deck-crim', sectionId: 'crim-68', title: 'มาตรา 68 - ป้องกันโดยชอบด้วยกฎหมาย' },
  { deckId: 'deck-crim', sectionId: 'crim-80', title: 'มาตรา 80 - พยายามกระทำความผิด' },
  { deckId: 'deck-crim', sectionId: 'crim-83', title: 'มาตรา 83 - ตัวการร่วม' },
  { deckId: 'deck-crim', sectionId: 'crim-84', title: 'มาตรา 84 - ผู้ใช้ให้กระทำความผิด' },
  { deckId: 'deck-crim', sectionId: 'crim-288', title: 'มาตรา 288 - ความผิดฐานฆ่าผู้อื่น' },
  { deckId: 'deck-crim', sectionId: 'crim-334', title: 'มาตรา 334 - ความผิดฐานลักทรัพย์' },
  { deckId: 'deck-civil', sectionId: 'civil-149', title: 'มาตรา 149 - ความหมายของนิติกรรม' },
  { deckId: 'deck-civil', sectionId: 'civil-150', title: 'มาตรา 150 - นิติกรรมที่มีวัตถุประสงค์ต้องห้าม' },
  { deckId: 'deck-civil', sectionId: 'civil-213', title: 'มาตรา 213 - การบังคับชำระหนี้' },
  { deckId: 'deck-civil', sectionId: 'civil-420', title: 'มาตรา 420 - ละเมิด' },
  { deckId: 'deck-civil', sectionId: 'civil-425', title: 'มาตรา 425 - นายจ้างร่วมรับผิดกับลูกจ้าง' },
  { deckId: 'deck-crim_proc', sectionId: 'crim_proc-2', title: 'มาตรา 2 - คำนิยาม (ผู้เสียหาย, ผู้ต้องหา)' },
  { deckId: 'deck-crim_proc', sectionId: 'crim_proc-28', title: 'มาตรา 28 - ผู้มีอำนาจฟ้องคดีอาญา' },
  { deckId: 'deck-crim_proc', sectionId: 'crim_proc-39', title: 'มาตรา 39 - สิทธินำคดีอาญามาฟ้องระงับ' },
  { deckId: 'deck-crim_proc', sectionId: 'crim_proc-158', title: 'มาตรา 158 - แบบของคำฟ้อง' }
];

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage write warning:', e);
  }
};

type MemoListener = () => void;
const listeners: Set<MemoListener> = new Set();
export const onMemorizeDataChanged = (fn: MemoListener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const notify = () => listeners.forEach(fn => fn());

/**
 * Hydrate item details (sectionNumber, content, bookId) from parsed laws
 */
function hydrateItem(item: MemorizationItem, lawsCache?: ReturnType<typeof getLaws>): MemorizationItem {
  if (item.content && item.sectionNumber && item.bookId) return item;
  const laws = lawsCache || getLaws();
  const law = laws.find(l => l.id === item.sectionId);
  if (law) {
    return {
      ...item,
      sectionNumber: item.sectionNumber || law.sectionNumber,
      content: item.content || law.content,
      bookId: item.bookId || law.bookId
    };
  }
  return item;
}

/**
 * Ensure starter decks & items are populated in LocalStorage if first time
 */
function ensureLocalSeed(): { decks: MemorizationDeck[]; items: MemorizationItem[] } {
  let decks = readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, []);
  let items = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);

  let changed = false;
  if (!decks || decks.length === 0) {
    decks = [...BUILTIN_DECKS];
    writeJson(MEMO_DECKS_KEY, decks);
    changed = true;
  }

  if (!items || items.length === 0) {
    const nowIso = new Date().toISOString();
    items = STARTER_ITEMS.map(s => ({
      id: `${s.deckId}_${s.sectionId}`,
      deckId: s.deckId,
      sectionId: s.sectionId,
      title: s.title,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      streak: 0,
      status: 'new' as const,
      nextReviewAt: nowIso
    }));
    writeJson(MEMO_ITEMS_KEY, items);
    changed = true;
  }

  if (changed) {
    notify();
  }

  return { decks, items };
}

/**
 * Fetch all decks (reads from local cache first, then refreshes from API if available)
 */
export async function fetchDecks(): Promise<MemorizationDeck[]> {
  ensureLocalSeed();
  const local = readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, BUILTIN_DECKS);
  
  try {
    const res = await fetch('/api/memorize?view=decks');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.decks)) {
        writeJson(MEMO_DECKS_KEY, data.decks);
        notify();
        return data.decks;
      }
    }
  } catch (e) {
    // Offline / fallback to local
  }

  return local;
}

export function getLocalDecks(): MemorizationDeck[] {
  ensureLocalSeed();
  return readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, BUILTIN_DECKS);
}

/**
 * Fetch items for a specific deck or all items
 */
export async function fetchItems(deckId?: string): Promise<MemorizationItem[]> {
  ensureLocalSeed();
  let local = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const allLaws = getLaws();
  local = local.map(i => hydrateItem(i, allLaws));
  
  try {
    const url = deckId ? `/api/memorize?deckId=${encodeURIComponent(deckId)}` : '/api/memorize';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const itemMap = new Map<string, MemorizationItem>();
        local.forEach(i => itemMap.set(i.id, i));
        data.items.forEach((i: MemorizationItem) => itemMap.set(i.id, hydrateItem(i, allLaws)));
        const merged = Array.from(itemMap.values());
        writeJson(MEMO_ITEMS_KEY, merged);
        if (data.decks) writeJson(MEMO_DECKS_KEY, data.decks);
        if (data.stats) writeJson(MEMO_STATS_KEY, data.stats);
        notify();
        return deckId ? merged.filter(i => i.deckId === deckId) : merged;
      }
    }
  } catch (e) {
    // Offline / fallback to local
  }

  return deckId ? local.filter(i => i.deckId === deckId) : local;
}

export function getLocalItems(deckId?: string): MemorizationItem[] {
  ensureLocalSeed();
  const all = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const allLaws = getLaws();
  const hydrated = all.map(i => hydrateItem(i, allLaws));
  return deckId ? hydrated.filter(i => i.deckId === deckId) : hydrated;
}

/**
 * Fetch items that are due for review today
 */
export async function fetchDueItems(): Promise<MemorizationItem[]> {
  const all = await fetchItems();
  const now = Date.now();
  return all.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now);
}

export function getLocalDueItems(): MemorizationItem[] {
  const all = getLocalItems();
  const now = Date.now();
  return all.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now);
}

export function getMemorizeStats(): MemorizationStats {
  const items = getLocalItems();
  const now = Date.now();
  const dueToday = items.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now).length;
  const mastered = items.filter(i => i.status === 'mastered').length;
  const learning = items.filter(i => i.status === 'learning' || i.status === 'new').length;

  return {
    total: items.length,
    dueToday,
    mastered,
    learning
  };
}

/**
 * Record a review attempt and compute SM-2 Spaced Repetition update
 */
export async function recordReview(
  itemId: string,
  quality: ReviewRating,
  mode = 'recall',
  timeSpentMs = 0
): Promise<MemorizationItem | undefined> {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const itemIndex = localItems.findIndex(i => i.id === itemId);
  if (itemIndex < 0) return undefined;

  const current = localItems[itemIndex];
  const srs = calculateNextSRS(current, quality);

  const updated: MemorizationItem = {
    ...current,
    repetitions: srs.repetitions,
    intervalDays: srs.intervalDays,
    easeFactor: srs.easeFactor,
    streak: srs.streak,
    lastQuality: quality,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: srs.nextReviewAt,
    status: srs.status
  };

  localItems[itemIndex] = updated;
  writeJson(MEMO_ITEMS_KEY, localItems);
  notify();

  // Async sync to server if configured
  fetch('/api/memorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'review',
      payload: { itemId, quality, mode, timeSpentMs }
    })
  }).catch(() => {});

  return updated;
}

/**
 * Add a section to a deck
 */
export async function addSectionToDeck(deckId: string, sectionId: string, title?: string): Promise<boolean> {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const existing = localItems.find(i => i.deckId === deckId && i.sectionId === sectionId);
  if (!existing) {
    const newItem: MemorizationItem = {
      id: `${deckId}_${sectionId}`,
      deckId,
      sectionId,
      title: title || `มาตรา ${sectionId}`,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      streak: 0,
      status: 'new',
      nextReviewAt: new Date().toISOString()
    };
    writeJson(MEMO_ITEMS_KEY, [newItem, ...localItems]);
    notify();
  }

  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_item',
        payload: { deckId, sectionId, title }
      })
    });
    if (res.ok) {
      await fetchItems();
      return true;
    }
  } catch (e) {
    // Offline ok
  }
  return true;
}

/**
 * Remove an item from memorization
 */
export async function removeItem(itemId: string): Promise<boolean> {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []).filter(i => i.id !== itemId);
  writeJson(MEMO_ITEMS_KEY, localItems);
  notify();

  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_item',
        payload: { itemId }
      })
    });
    return res.ok;
  } catch (e) {
    // Offline ok
  }
  return true;
}

/**
 * Save or create a custom deck
 */
export async function saveDeck(deck: Partial<MemorizationDeck> & { name: string }): Promise<string | undefined> {
  const localDecks = readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, BUILTIN_DECKS);
  const deckId = deck.id || `custom-deck-${Date.now()}`;
  const newDeck: MemorizationDeck = {
    id: deckId,
    name: deck.name,
    description: deck.description || '',
    color: deck.color || 'bg-purple-600',
    isBuiltin: false,
    sortOrder: (localDecks.length + 1)
  };

  const existingIdx = localDecks.findIndex(d => d.id === deckId);
  if (existingIdx >= 0) {
    localDecks[existingIdx] = { ...localDecks[existingIdx], ...newDeck };
  } else {
    localDecks.push(newDeck);
  }
  writeJson(MEMO_DECKS_KEY, localDecks);
  notify();

  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_deck',
        payload: deck
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.deckId || deckId;
    }
  } catch (e) {
    // Offline ok
  }
  return deckId;
}

/**
 * Delete a deck
 */
export async function deleteDeck(deckId: string): Promise<boolean> {
  const localDecks = readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, BUILTIN_DECKS).filter(d => d.id !== deckId);
  writeJson(MEMO_DECKS_KEY, localDecks);
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []).filter(i => i.deckId !== deckId);
  writeJson(MEMO_ITEMS_KEY, localItems);
  notify();

  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_deck',
        payload: { deckId }
      })
    });
    return res.ok;
  } catch (e) {
    // Offline ok
  }
  return true;
}

/**
 * Background initial loader
 */
if (typeof window !== 'undefined') {
  setTimeout(() => {
    ensureLocalSeed();
    fetchDecks().catch(() => {});
    fetchItems().catch(() => {});
  }, 1000);
}
