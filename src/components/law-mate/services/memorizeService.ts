import { MemorizationDeck, MemorizationItem, MemorizationStats } from '../types';
import { calculateNextSRS, ReviewRating } from './srsEngine';
import { getLaws } from './dataService';
import { compareSectionNumbers } from '@/utils/sectionSort';

const MEMO_DECKS_KEY = 'thai_law_mate_memo_decks';
const MEMO_ITEMS_KEY = 'thai_law_mate_memo_items';
const MEMO_STATS_KEY = 'thai_law_mate_memo_stats';

/**
 * Sorts memorization items by section number ascending (1 -> 2 -> ... -> 59 -> ... -> 288 -> 288/1 -> ...)
 */
export function sortMemoItems(items: MemorizationItem[]): MemorizationItem[] {
  return [...items].sort((a, b) => {
    // 1. Group by deckId first
    if (a.deckId !== b.deckId) {
      return a.deckId.localeCompare(b.deckId);
    }
    // 2. Sort by section number ascending within deck
    const secA = a.sectionNumber || a.title || '';
    const secB = b.sectionNumber || b.title || '';
    return compareSectionNumbers(secA, secB);
  });
}

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
  },
  {
    id: 'deck-consumer_proc',
    name: 'พ.ร.บ. วิธีพิจารณาคดีผู้บริโภค (ผบ.)',
    description: 'กระบวนพิจารณาคดีผู้บริโภค ภาระการพิสูจน์ ความรับผิดสินค้าที่ไม่ปลอดภัย (ม. 3, 17, 29)',
    color: 'bg-amber-600',
    sortOrder: 9,
    isBuiltin: true
  },
  {
    id: 'deck-copyright',
    name: 'พ.ร.บ. ลิขสิทธิ์',
    description: 'งานอันมีลิขสิทธิ์ การคุ้มครอง ข้อยกเว้นการละเมิดลิขสิทธิ์ (ม. 6, 15, 27, 32)',
    color: 'bg-purple-600',
    sortOrder: 10,
    isBuiltin: true
  },
  {
    id: 'deck-juvenile_court',
    name: 'พ.ร.บ. ศาลเยาวชนและครอบครัวฯ',
    description: 'กระบวนพิจารณาคดีเด็กและเยาวชน การจับกุม การตรวจสอบการจับ (ม. 4, 65, 71)',
    color: 'bg-pink-600',
    sortOrder: 11,
    isBuiltin: true
  },
  {
    id: 'deck-labour_protection',
    name: 'พ.ร.บ. คุ้มครองแรงงาน',
    description: 'การใช้แรงงาน ค่าจ้าง สิทธิ ค่าชดเชยการเลิกจ้าง (ม. 5, 118, 119)',
    color: 'bg-orange-500',
    sortOrder: 12,
    isBuiltin: true
  },
  {
    id: 'deck-admin_court',
    name: 'พ.ร.บ. จัดตั้งศาลปกครองฯ',
    description: 'เขตอำนาจศาลปกครอง อำนาจฟ้อง เงื่อนไขและอายุความฟ้องคดี (ม. 9, 42, 49)',
    color: 'bg-sky-600',
    sortOrder: 13,
    isBuiltin: true
  },
  {
    id: 'deck-revenue',
    name: 'ประมวลรัษฎากร (ป.รัษฎากร)',
    description: 'ภาษีเงินได้บุคคลธรรมดาและนิติบุคคล ภาษีมูลค่าเพิ่ม อากรแสตมป์ (ม. 39, 40)',
    color: 'bg-emerald-700',
    sortOrder: 14,
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
  { deckId: 'deck-crim_proc', sectionId: 'crim_proc-158', title: 'มาตรา 158 - แบบของคำฟ้อง' },
  { deckId: 'deck-consumer_proc', sectionId: 'consumer_proc-3', title: 'มาตรา 3 - คำนิยามคดีผู้บริโภค' },
  { deckId: 'deck-consumer_proc', sectionId: 'consumer_proc-17', title: 'มาตรา 17 - การฟ้องคดีผู้บริโภค' },
  { deckId: 'deck-consumer_proc', sectionId: 'consumer_proc-29', title: 'มาตรา 29 - ภาระการพิสูจน์ข้อเท็จจริง' },
  { deckId: 'deck-copyright', sectionId: 'copyright-6', title: 'มาตรา 6 - งานอันมีลิขสิทธิ์' },
  { deckId: 'deck-copyright', sectionId: 'copyright-15', title: 'มาตรา 15 - สิทธิแต่ผู้เดียวของเจ้าของลิขสิทธิ์' },
  { deckId: 'deck-copyright', sectionId: 'copyright-27', title: 'มาตรา 27 - การละเมิดลิขสิทธิ์' },
  { deckId: 'deck-copyright', sectionId: 'copyright-32', title: 'มาตรา 32 - ข้อยกเว้นการละเมิดลิขสิทธิ์ (Fair Use)' },
  { deckId: 'deck-juvenile_court', sectionId: 'juvenile_court-4', title: 'มาตรา 4 - คำนิยามเด็กและเยาวชน' },
  { deckId: 'deck-juvenile_court', sectionId: 'juvenile_court-65', title: 'มาตรา 65 - การจับกุมเด็กหรือเยาวชน' },
  { deckId: 'deck-juvenile_court', sectionId: 'juvenile_court-71', title: 'มาตรา 71 - การตรวจสอบการจับ' },
  { deckId: 'deck-labour_protection', sectionId: 'labour_protection-5', title: 'มาตรา 5 - คำนิยามนายจ้าง ลูกจ้าง' },
  { deckId: 'deck-labour_protection', sectionId: 'labour_protection-118', title: 'มาตรา 118 - ค่าชดเชยการเลิกจ้าง' },
  { deckId: 'deck-labour_protection', sectionId: 'labour_protection-119', title: 'มาตรา 119 - ข้อยกเว้นไม่ต้องจ่ายค่าชดเชย' },
  { deckId: 'deck-admin_court', sectionId: 'admin_court-9', title: 'มาตรา 9 - เขตอำนาจศาลปกครอง' },
  { deckId: 'deck-admin_court', sectionId: 'admin_court-42', title: 'มาตรา 42 - ผู้มีสิทธิฟ้องคดีปกครอง' },
  { deckId: 'deck-admin_court', sectionId: 'admin_court-49', title: 'มาตรา 49 - อายุความการฟ้องคดีปกครอง' },
  { deckId: 'deck-revenue', sectionId: 'revenue-39', title: 'มาตรา 39 - คำนิยามเงินได้พึงประเมิน' },
  { deckId: 'deck-revenue', sectionId: 'revenue-40', title: 'มาตรา 40 - เงินได้พึงประเมิน 8 ประเภท' }
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
  if (!item.sectionNumber) {
    const cleanTitle = item.title?.replace(/^(มาตรา|ม\.)\s*/, '') || '';
    const match = cleanTitle.match(/^([0-9๐-๙]+(\/[0-9๐-๙]+)?(\s*(ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
    if (match) {
      return { ...item, sectionNumber: match[1] };
    }
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
  } else {
    // If some BUILTIN_DECKS are missing in existing decks, merge them in
    let deckAdded = false;
    for (const bd of BUILTIN_DECKS) {
      if (!decks.some(d => d.id === bd.id)) {
        decks.push(bd);
        deckAdded = true;
      }
    }
    if (deckAdded) {
      writeJson(MEMO_DECKS_KEY, decks);
      changed = true;
    }
  }

  if (!items || items.length === 0) {
    const nowIso = new Date().toISOString();
    const rawItems = STARTER_ITEMS.map(s => {
      const match = s.title.match(/มาตรา\s+([0-9]+(\/[0-9]+)?(\s*(ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
      const sectionNumber = match ? match[1] : '';
      return {
        id: `${s.deckId}_${s.sectionId}`,
        deckId: s.deckId,
        sectionId: s.sectionId,
        title: s.title,
        sectionNumber,
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        streak: 0,
        status: 'new' as const,
        nextReviewAt: nowIso
      };
    });
    items = sortMemoItems(rawItems);
    writeJson(MEMO_ITEMS_KEY, items);
    changed = true;
  } else {
    // Merge any missing starter items
    const nowIso = new Date().toISOString();
    let itemAdded = false;
    for (const s of STARTER_ITEMS) {
      const itemId = `${s.deckId}_${s.sectionId}`;
      if (!items.some(i => i.id === itemId)) {
        const match = s.title.match(/มาตรา\s+([0-9]+(\/[0-9]+)?(\s*(ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
        const sectionNumber = match ? match[1] : '';
        items.push({
          id: itemId,
          deckId: s.deckId,
          sectionId: s.sectionId,
          title: s.title,
          sectionNumber,
          repetitions: 0,
          intervalDays: 1,
          easeFactor: 2.5,
          streak: 0,
          status: 'new' as const,
          nextReviewAt: nowIso
        });
        itemAdded = true;
      }
    }
    if (itemAdded) {
      items = sortMemoItems(items);
      writeJson(MEMO_ITEMS_KEY, items);
      changed = true;
    }
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
    const res = await fetch('/api/memorize?view=decks', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.decks)) {
        const customDecks: MemorizationDeck[] = data.decks.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          color: d.color || 'bg-purple-600',
          sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 99,
          isBuiltin: false
        }));

        const localCustom = local.filter(d => !d.isBuiltin);
        const deckMap = new Map<string, MemorizationDeck>();
        localCustom.forEach(d => deckMap.set(d.id, d));
        customDecks.forEach(d => deckMap.set(d.id, d));

        const merged = [...BUILTIN_DECKS, ...Array.from(deckMap.values())];
        writeJson(MEMO_DECKS_KEY, merged);
        notify();
        return merged;
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
 * Fetch items for a specific deck or all items, naturally sorted by section number ascending
 */
export async function fetchItems(deckId?: string): Promise<MemorizationItem[]> {
  ensureLocalSeed();
  let local = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const allLaws = getLaws();
  local = sortMemoItems(local.map(i => hydrateItem(i, allLaws)));
  
  try {
    const url = deckId ? `/api/memorize?deckId=${encodeURIComponent(deckId)}` : '/api/memorize';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const itemMap = new Map<string, MemorizationItem>();
        local.forEach(i => itemMap.set(i.id, i));
        data.items.forEach((i: MemorizationItem) => itemMap.set(i.id, hydrateItem(i, allLaws)));
        const merged = sortMemoItems(Array.from(itemMap.values()));
        writeJson(MEMO_ITEMS_KEY, merged);
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
  const hydrated = sortMemoItems(all.map(i => hydrateItem(i, allLaws)));
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
 * Add a section to a deck, ensuring it is naturally sorted by section number ascending
 */
export async function addSectionToDeck(deckId: string, sectionId: string, title?: string): Promise<boolean> {
  const allLaws = getLaws();
  const foundLaw = allLaws.find(l => l.id === sectionId);
  const sectionNumber = foundLaw?.sectionNumber || title?.replace(/^(มาตรา|ม\.)\s*/, '').split(/[\s-]/)[0] || '';
  const bookId = foundLaw?.bookId || deckId.replace('deck-', '');

  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const existing = localItems.find(i => i.deckId === deckId && i.sectionId === sectionId);
  
  let updatedItems = [...localItems];
  if (!existing) {
    const newItem: MemorizationItem = {
      id: `${deckId}_${sectionId}`,
      deckId,
      sectionId,
      title: title || (foundLaw ? `มาตรา ${foundLaw.sectionNumber}` : `มาตรา ${sectionId}`),
      sectionNumber,
      content: foundLaw?.content,
      bookId,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      streak: 0,
      status: 'new',
      nextReviewAt: new Date().toISOString()
    };
    updatedItems.push(newItem);
  }

  // Always sort items by section number ascending (จากน้อยไปหามาก แม้จะเพิ่มเข้ามาทีหลัง)
  updatedItems = sortMemoItems(updatedItems.map(i => hydrateItem(i, allLaws)));
  writeJson(MEMO_ITEMS_KEY, updatedItems);
  notify();

  // If Admin: saves to DB via /api/memorize. If regular user: stays in local device.
  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_item',
        payload: { 
          deckId, 
          sectionId, 
          title: title || (foundLaw ? `มาตรา ${foundLaw.sectionNumber}` : `มาตรา ${sectionId}`), 
          sectionNumber, 
          bookId 
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.savedToDb) {
        await fetchItems();
      }
      return true;
    }
  } catch (e) {
    // Offline ok
  }
  return true;
}

/**
 * Mark a section as remembered (จำได้ - Mastered) or unremembered (จำไม่ได้ - Need review) directly
 */
export async function markSectionMastery(
  sectionId: string,
  bookId?: string,
  remembered: boolean = true,
  title?: string
): Promise<MemorizationItem | undefined> {
  const targetDeckId = `deck-${bookId || 'crim'}`;
  let localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  let item = localItems.find(i => i.sectionId === sectionId);

  if (!item) {
    // Automatically add to deck first
    await addSectionToDeck(targetDeckId, sectionId, title);
    localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
    item = localItems.find(i => i.sectionId === sectionId);
  }

  if (item) {
    // Quality 3 for remembered (Good), Quality 1 for unremembered (Again/Weak)
    const updated = await recordReview(item.id, remembered ? 3 : 1, 'recall');
    // Background sync mastery status to server
    try {
      fetch('/api/memorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_mastery',
          payload: {
            itemId: item.id,
            sectionId: item.sectionId,
            masteryStatus: remembered ? 'mastered' : 'need_review'
          }
        })
      }).catch(() => {});
    } catch {}
    return updated;
  }
  return undefined;
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
        payload: newDeck
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.deck?.id || deckId;
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
 * Get user-created custom folders/playlists
 */
export function getUserFolders(): MemorizationDeck[] {
  return getLocalDecks().filter(d => !d.isBuiltin);
}

/**
 * Get custom folders that contain a specific section
 */
export function getSectionFolders(sectionId: string): MemorizationDeck[] {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const inDecks = new Set(localItems.filter(i => i.sectionId === sectionId).map(i => i.deckId));
  return getUserFolders().filter(f => inDecks.has(f.id));
}

/**
 * Toggle a section's inclusion in a custom folder
 */
export async function toggleSectionInFolder(deckId: string, sectionId: string, title?: string): Promise<boolean> {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const existing = localItems.find(i => i.deckId === deckId && i.sectionId === sectionId);
  if (existing) {
    await removeItem(existing.id);
    return false; // Removed
  } else {
    await addSectionToDeck(deckId, sectionId, title);
    return true; // Added
  }
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
