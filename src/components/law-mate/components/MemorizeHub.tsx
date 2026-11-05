import React, { useState, useEffect } from 'react';
import { 
  Brain, Flame, CheckCircle2, Plus, Play, 
  Trash2, BookOpen, Search, X, Folder, Volume2,
  Edit3, ListMusic, ArrowLeft, RotateCcw
} from 'lucide-react';
import { MemorizationDeck, MemorizationItem, MemorizationStats, LawSection, AppSettings } from '../types';
import { 
  fetchDecks, fetchItems, fetchDueItems, getLocalDecks, 
  getLocalItems, getLocalDueItems, getMemorizeStats, 
  saveDeck, deleteDeck, removeItem, addSectionToDeck, onMemorizeDataChanged,
  sortMemoItems
} from '../services/memorizeService';
import { getLaws, getBooks } from '../services/dataService';
import { formatNextReview } from '../services/srsEngine';
import { thaiToArabic } from '../utils/textUtils';
import { sortSectionsAscending } from '@/utils/sectionSort';
import { MemorizePlayer } from './MemorizePlayer';
import { FolderAudioPlayer } from './FolderAudioPlayer';

interface MemorizeHubProps {
  settings?: AppSettings;
}

export const MemorizeHub: React.FC<MemorizeHubProps> = ({ settings }) => {
  const [decks, setDecks] = useState<MemorizationDeck[]>(getLocalDecks());
  const [items, setItems] = useState<MemorizationItem[]>(getLocalItems());
  const [dueItems, setDueItems] = useState<MemorizationItem[]>(getLocalDueItems());
  const [stats, setStats] = useState<MemorizationStats>(getMemorizeStats());
  const [, setLoading] = useState(false);

  // Active Law Book Tab ('all', 'crim', 'civil', 'crim_proc', 'civil_proc', 'const', 'bankruptcy', 'kwaeng', 'court_const', 'custom')
  const [activeBookTab, setActiveBookTab] = useState<string>('all');

  // Active study session
  const [activeSession, setActiveSession] = useState<{
    items: MemorizationItem[];
    deckTitle: string;
  } | null>(null);

  // Active audio playlist session (Continuous loop player)
  const [audioPlaylistSession, setAudioPlaylistSession] = useState<{
    items: MemorizationItem[];
    title: string;
  } | null>(null);

  // Selected folder for detail view
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Filter & Search in Items List
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // New deck modal
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckColor] = useState('bg-amber-600');

  // Edit deck modal
  const [editingDeck, setEditingDeck] = useState<MemorizationDeck | null>(null);
  const [editDeckName, setEditDeckName] = useState('');
  const [editDeckDesc, setEditDeckDesc] = useState('');

  // Add Item to Deck Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addModalTargetBookId, setAddModalTargetBookId] = useState('');
  const [addModalTargetDeckId, setAddModalTargetDeckId] = useState('');
  const [addModalSearch, setAddModalSearch] = useState('');
  const [allLaws, setAllLaws] = useState<LawSection[]>([]);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  const reloadData = async () => {
    setLoading(true);
    const [loadedDecks, loadedItems, loadedDue] = await Promise.all([
      fetchDecks(),
      fetchItems(),
      fetchDueItems()
    ]);
    setDecks(loadedDecks);
    setItems(loadedItems);
    setDueItems(loadedDue);
    setStats(getMemorizeStats());
    setLoading(false);
  };

  useEffect(() => {
    reloadData();
    setAllLaws(getLaws());
    return onMemorizeDataChanged(() => {
      setDecks(getLocalDecks());
      setItems(getLocalItems());
      setDueItems(getLocalDueItems());
      setStats(getMemorizeStats());
    });
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    await saveDeck({
      name: newDeckName.trim(),
      description: newDeckDesc.trim() || undefined,
      color: newDeckColor
    });
    setNewDeckName('');
    setNewDeckDesc('');
    setShowNewDeckModal(false);
    reloadData();
  };

  const handleDeleteDeck = async (deckId: string, name: string) => {
    if (!window.confirm(`ต้องการลบชุดท่อง "${name}" และรายการทั้งหมดในชุดนี้หรือไม่?`)) return;
    await deleteDeck(deckId);
    reloadData();
  };

  const books = getBooks();

  const getItemsForBook = (bookId: string) => {
    return sortMemoItems(items.filter(i => {
      if (i.bookId === bookId) return true;
      if (i.deckId === `deck-${bookId}`) return true;
      if (i.sectionId.startsWith(`${bookId}-`)) return true;
      const l = allLaws.find(law => law.id === i.sectionId);
      return l?.bookId === bookId;
    }));
  };

  const activeBook = books.find(b => b.id === activeBookTab);
  const customDecks = decks.filter(d => !d.isBuiltin);
  const selectedFolder = selectedFolderId ? customDecks.find(d => d.id === selectedFolderId) : null;
  const selectedFolderItems = selectedFolder ? sortMemoItems(items.filter(i => i.deckId === selectedFolder.id)) : [];

  const handleStartEditDeck = (deck: MemorizationDeck) => {
    setEditingDeck(deck);
    setEditDeckName(deck.name);
    setEditDeckDesc(deck.description || '');
  };

  const handleSaveEditDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeck || !editDeckName.trim()) return;
    await saveDeck({
      id: editingDeck.id,
      name: editDeckName.trim(),
      description: editDeckDesc.trim() || undefined,
      color: editingDeck.color
    });
    setEditingDeck(null);
    reloadData();
  };

  const currentTabItems = sortMemoItems(
    activeBookTab === 'all'
      ? items
      : (activeBookTab === 'custom'
          ? (selectedFolder ? selectedFolderItems : items.filter(i => customDecks.some(cd => cd.id === i.deckId)))
          : getItemsForBook(activeBookTab))
  );

  const currentTabDueItems = currentTabItems.filter(
    i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= Date.now()
  );

  const handleRemoveItem = async (itemId: string, sectionNumber?: string, bookName?: string) => {
    const fromWhere = bookName ? `ออกจาก ${bookName}` : 'ออกจากระบบท่องสอบ';
    if (!window.confirm(`ต้องการนำมาตรา ${sectionNumber || ''} ${fromWhere} หรือไม่?`)) return;
    await removeItem(itemId);
    reloadData();
  };

  const handleOpenAddModal = (bookId?: string, targetDeckId?: string) => {
    const defaultBook = bookId || (activeBookTab !== 'all' && activeBookTab !== 'custom' ? activeBookTab : books[0]?.id || 'crim');
    setAddModalTargetBookId(defaultBook);
    setAddModalTargetDeckId(targetDeckId || (bookId ? `deck-${bookId}` : ''));
    setAddModalSearch('');
    setAddedItemIds(new Set());
    setShowAddItemModal(true);
  };

  const handleAddSectionToDeck = async (law: LawSection) => {
    let targetDeckId = addModalTargetDeckId;
    if (!targetDeckId) {
      const bookId = law.bookId || addModalTargetBookId || 'crim';
      targetDeckId = `deck-${bookId}`;
    }

    await addSectionToDeck(targetDeckId, law.id, `มาตรา ${law.sectionNumber}`);
    setAddedItemIds(prev => new Set(prev).add(law.id));
    reloadData();
  };

  // If in active continuous audio session, render FolderAudioPlayer
  if (audioPlaylistSession) {
    return (
      <FolderAudioPlayer
        items={audioPlaylistSession.items}
        folderTitle={audioPlaylistSession.title}
        settings={settings}
        onClose={() => setAudioPlaylistSession(null)}
        onOpenMemorize={(mItems) => {
          const t = audioPlaylistSession.title;
          setAudioPlaylistSession(null);
          setActiveSession({ items: mItems, deckTitle: t });
        }}
      />
    );
  }

  // If in active study session, render player
  if (activeSession) {
    return (
      <MemorizePlayer
        items={activeSession.items}
        deckTitle={activeSession.deckTitle}
        settings={settings}
        onFinish={() => { setActiveSession(null); reloadData(); }}
        onBack={() => { setActiveSession(null); reloadData(); }}
      />
    );
  }

  // Filter items for the table
  const filteredItems = currentTabItems.filter(item => {
    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.trim().toLowerCase();
      const matchSection = (item.sectionNumber || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      if (!matchSection && !matchTitle && !matchContent) return false;
    }
    return true;
  });

  // Filter laws in Add Item modal, sorted ascending by section number
  const searchedLaws = sortSectionsAscending(
    allLaws.filter(l => {
      if (addModalTargetBookId && l.bookId !== addModalTargetBookId) return false;
      if (!addModalSearch.trim()) return true;
      const q = addModalSearch.trim().toLowerCase();
      const cleanSection = thaiToArabic(l.sectionNumber).toLowerCase();
      const matchSec = cleanSection.includes(q) || l.sectionNumber.includes(q);
      const matchContent = l.content.toLowerCase().includes(q);
      return matchSec || matchContent;
    }),
    l => l.sectionNumber
  ).slice(0, 30);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 max-w-5xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-law-700 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">
            <Brain size={15} />
            <span>ระบบท่องกฎหมายเพื่อเตรียมสอบ (Active Recall & SRS)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ท่องตัวบทแม่นยำ ไม่ลืมก่อนเข้าห้องสอบ
          </h1>
          <p className="text-purple-100 text-sm leading-relaxed">
            ระบบคำนวณรอบทบทวนอัตโนมัติตามหลักความจำ Spaced Repetition เลือกท่องทีละวรรค เติมคำสำคัญ หรือท่องพร้อมเสียงเฉลย
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-4 bottom-2 opacity-15 pointer-events-none">
          <Brain size={240} />
        </div>
      </div>

      {/* Stats & Daily Review CTA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">ต้องทบทวนวันนี้</div>
          <div className="text-2xl font-black text-red-500">{dueItems.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">กำลังเรียนรู้</div>
          <div className="text-2xl font-black text-amber-500">
            {items.filter(i => i.status === 'learning' || i.status === 'new').length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">จำได้ขึ้นใจแล้ว</div>
          <div className="text-2xl font-black text-emerald-600">
            {items.filter(i => i.status === 'mastered').length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">มาตราในชุดท่อง</div>
          <div className="text-2xl font-black text-law-600">{items.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>
      </div>

      {/* Start Daily Review Button */}
      {dueItems.length > 0 && (
        <div className="p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Flame size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                มี {dueItems.length} มาตราที่ถึงกำหนดต้องทบทวนวันนี้!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ทบทวนเพียง 5-10 นาทีต่อวัน ช่วยให้จำตัวบทได้ยาวนานและแม่นยำที่สุด
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSession({ items: sortMemoItems(dueItems), deckTitle: 'ทบทวนมาตราประจำวัน' })}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0"
          >
            <Play size={18} />
            <span>เริ่มทบทวนมาตราวันนี้ ({dueItems.length})</span>
          </button>
        </div>
      )}

      {/* Law Book Navigation Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-law-600" size={20} />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">เลือกกฎหมายเพื่อท่องสอบ</h2>
          </div>
          <button
            onClick={() => handleOpenAddModal()}
            className="py-1.5 px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200 dark:border-purple-800"
          >
            <Plus size={15} />
            <span>เพิ่มมาตราใหม่</span>
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveBookTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
              activeBookTab === 'all'
                ? 'bg-law-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>🌟 ทุกกฎหมาย</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeBookTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
              {items.length}
            </span>
          </button>

          {books.map(book => {
            const bItems = getItemsForBook(book.id);
            const bDue = bItems.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= Date.now());
            const isActive = activeBookTab === book.id;

            return (
              <button
                key={book.id}
                onClick={() => setActiveBookTab(book.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-law-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{book.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                  {bItems.length}
                </span>
                {bDue.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`มีถึงคิวทบทวน ${bDue.length} มาตรา`} />
                )}
              </button>
            );
          })}

          <button
            onClick={() => { setActiveBookTab('custom'); setSelectedFolderId(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeBookTab === 'custom'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Folder size={14} />
            <span>โฟลเดอร์ของฉัน</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeBookTab === 'custom' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold'}`}>
              {customDecks.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Specific Law Book is Active */}
      {activeBook && activeBookTab !== 'all' && activeBookTab !== 'custom' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Law Book Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${activeBook.color || 'bg-purple-600'}`} />
                  <span className="text-xs font-bold text-gray-400">กฎหมายฉบับที่เลือก</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {activeBook.name} ({activeBook.abbreviation})
                </h2>
                {activeBook.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeBook.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddModal(activeBook.id)}
                  className="py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200 dark:border-purple-800"
                >
                  <Plus size={15} />
                  <span>เพิ่มมาตราในฉบับนี้</span>
                </button>
                <button
                  disabled={currentTabItems.length === 0}
                  onClick={() => setActiveSession({ items: currentTabItems, deckTitle: activeBook.name })}
                  className="py-2.5 px-5 rounded-xl bg-law-600 hover:bg-law-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-40"
                >
                  <Play size={15} />
                  <span>เริ่มท่องฉบับนี้ ({currentTabItems.length})</span>
                </button>
              </div>
            </div>

            {/* Book Specific Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">มาตราในฉบับนี้</div>
                <div className="text-lg font-bold text-law-600">{currentTabItems.length}</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">ถึงคิวทบทวนวันนี้</div>
                <div className="text-lg font-bold text-red-500">{currentTabDueItems.length}</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">จำได้ขึ้นใจแล้ว</div>
                <div className="text-lg font-bold text-emerald-600">
                  {currentTabItems.filter(i => i.status === 'mastered').length}
                </div>
              </div>
            </div>
          </div>

          {/* Section list for this specific book */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-law-600" size={18} />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  มาตราใน {activeBook.name} ({filteredItems.length})
                </h3>
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder={`ค้นหาใน ${activeBook.abbreviation}...`}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:border-law-500"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 space-y-3">
                <p>ยังไม่มีมาตราในชุดท่อง {activeBook.name}</p>
                <button
                  onClick={() => handleOpenAddModal(activeBook.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold py-2 px-4 rounded-xl bg-law-50 dark:bg-law-950 text-law-600 dark:text-law-300 hover:bg-law-100 transition"
                >
                  <Plus size={14} />
                  <span>ค้นหาและเพิ่มมาตราจาก {activeBook.name}</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {filteredItems.map(item => {
                  const reviewStatus = formatNextReview(item.nextReviewAt);

                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-law-600 shrink-0">ม. {item.sectionNumber}</span>
                        <div className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs sm:max-w-md">
                          {item.title || item.content?.slice(0, 60)}...
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        {item.status === 'mastered' || (typeof item.lastQuality === 'number' && item.lastQuality >= 3) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🟢 จำได้
                          </span>
                        ) : item.status === 'learning' || item.lastQuality === 1 || item.lastQuality === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            🔴 ยังจำไม่ได้
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            ⚪ รอท่อง
                          </span>
                        )}
                        <span className={`font-semibold hidden sm:inline ${reviewStatus.color}`}>
                          {reviewStatus.label}
                        </span>
                        <button
                          onClick={() => setActiveSession({ items: [item], deckTitle: `ท่องมาตรา ${item.sectionNumber}` })}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-law-600 hover:text-white transition"
                          title="ท่องมาตรานี้ทันที"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id, item.sectionNumber, activeBook.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          title={`ลบมาตรานี้ออกจาก ${activeBook.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: All Books Overview */}
      {activeBookTab === 'all' && (
        <div className="space-y-6">
          {/* Law Books Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">กฎหมายแต่ละฉบับ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map(book => {
                const bItems = getItemsForBook(book.id);
                const bDue = bItems.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= Date.now());

                return (
                  <div
                    key={book.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`w-3 h-3 rounded-full ${book.color || 'bg-law-600'}`} />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {book.abbreviation}
                        </span>
                      </div>

                      <h4
                        onClick={() => setActiveBookTab(book.id)}
                        className="font-bold text-base text-gray-900 dark:text-white group-hover:text-law-600 transition cursor-pointer"
                      >
                        {book.name}
                      </h4>

                      {book.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {book.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{bItems.length}</span> มาตรา
                        {bDue.length > 0 && (
                          <span className="ml-1.5 text-red-500 font-bold">(ถึงคิว {bDue.length})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveBookTab(book.id)}
                          className="py-1 px-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold transition"
                        >
                          จัดการ
                        </button>
                        <button
                          disabled={bItems.length === 0}
                          onClick={() => setActiveSession({ items: bItems, deckTitle: book.name })}
                          className="py-1 px-3 rounded-xl bg-law-50 hover:bg-law-600 text-law-600 hover:text-white dark:bg-law-950/50 dark:text-law-300 dark:hover:bg-law-600 dark:hover:text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                        >
                          <Play size={13} />
                          <span>ท่อง</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick All Law Section List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-law-600" size={18} />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  มาตราทั้งหมดในระบบท่องสอบ ({filteredItems.length})
                </h3>
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder="ค้นหามาตรา..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:border-law-500"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 space-y-2">
                <div>ไม่พบมาตราในชุดท่อง</div>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-law-600 hover:underline"
                >
                  <Plus size={14} />
                  <span>คลิกที่นี่เพื่อค้นหาและเพิ่มมาตราเข้าชุดท่อง</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {filteredItems.map(item => {
                  const reviewStatus = formatNextReview(item.nextReviewAt);
                  const matchedBook = books.find(b => item.sectionId.startsWith(`${b.id}-`) || item.bookId === b.id || item.deckId === `deck-${b.id}`);

                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-law-600 shrink-0">ม. {item.sectionNumber}</span>
                        <div className="min-w-0">
                          <div className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs sm:max-w-md">
                            {item.title || item.content?.slice(0, 60)}...
                          </div>
                          {matchedBook && (
                            <div className="text-[10px] text-gray-400 truncate">
                              {matchedBook.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        {item.status === 'mastered' || (typeof item.lastQuality === 'number' && item.lastQuality >= 3) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🟢 จำได้
                          </span>
                        ) : item.status === 'learning' || item.lastQuality === 1 || item.lastQuality === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            🔴 ยังจำไม่ได้
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            ⚪ รอท่อง
                          </span>
                        )}
                        <span className={`font-semibold hidden sm:inline ${reviewStatus.color}`}>
                          {reviewStatus.label}
                        </span>
                        <button
                          onClick={() => setActiveSession({ items: [item], deckTitle: `ท่องมาตรา ${item.sectionNumber}` })}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-law-600 hover:text-white transition"
                          title="ท่องมาตรานี้ทันที"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id, item.sectionNumber, matchedBook?.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          title="ลบมาตรานี้ออกจากชุดท่อง"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Custom Folders / Playlists */}
      {activeBookTab === 'custom' && selectedFolder && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Selected Folder Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-law-600 transition mb-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>กลับสู่โฟลเดอร์ทั้งหมด</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${selectedFolder.color || 'bg-amber-600'}`} />
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    {selectedFolder.name}
                  </h2>
                </div>
                {selectedFolder.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedFolder.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(undefined, selectedFolder.id)}
                  className="py-2 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 border border-amber-300 dark:border-amber-800 cursor-pointer shadow-2xs"
                >
                  <Plus size={15} />
                  <span>เพิ่มมาตราเข้าโฟลเดอร์</span>
                </button>
                <button
                  type="button"
                  disabled={selectedFolderItems.length === 0}
                  onClick={() => setAudioPlaylistSession({ items: selectedFolderItems, title: selectedFolder.name })}
                  className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
                  title="เล่นเสียงอ่านทุกมาตราในโฟลเดอร์นี้วนลูปต่อเนื่อง"
                >
                  <Volume2 size={15} />
                  <span>▶️ ฟังวนลูป ({selectedFolderItems.length})</span>
                </button>
                <button
                  type="button"
                  disabled={selectedFolderItems.length === 0}
                  onClick={() => setActiveSession({ items: selectedFolderItems, deckTitle: selectedFolder.name })}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
                  title="เริ่มฝึกท่องจำมาตราในโฟลเดอร์นี้"
                >
                  <Brain size={15} />
                  <span>เริ่มท่องจำ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartEditDeck(selectedFolder)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                  title="เปลี่ยนชื่อ / แก้ไขโฟลเดอร์"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteDeck(selectedFolder.id, selectedFolder.name);
                    setSelectedFolderId(null);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                  title="ลบโฟลเดอร์นี้"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Folder Specific Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">มาตราในโฟลเดอร์</div>
                <div className="text-lg font-bold text-law-600">{selectedFolderItems.length}</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">ยังจำไม่ได้</div>
                <div className="text-lg font-bold text-rose-500">
                  {selectedFolderItems.filter(i => i.status === 'learning' || i.lastQuality === 1 || i.lastQuality === 2 || (i.status === 'new' && !i.lastQuality)).length}
                </div>
              </div>
              <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="text-[10px] text-gray-400 font-medium">จำได้ขึ้นใจแล้ว</div>
                <div className="text-lg font-bold text-emerald-600">
                  {selectedFolderItems.filter(i => i.status === 'mastered' || (typeof i.lastQuality === 'number' && i.lastQuality >= 3)).length}
                </div>
              </div>
            </div>
          </div>

          {/* Section list for this folder */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-law-600" size={18} />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  มาตราในโฟลเดอร์ ({selectedFolderItems.length})
                </h3>
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder="ค้นหาในโฟลเดอร์นี้..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:border-law-500"
                />
              </div>
            </div>

            {selectedFolderItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 space-y-3 bg-gray-50/50 dark:bg-gray-850 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <p>ยังไม่มีมาตราในโฟลเดอร์ {selectedFolder.name}</p>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(undefined, selectedFolder.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold py-2 px-4 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  <span>ค้นหาและเพิ่มมาตราเข้าโฟลเดอร์นี้</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {selectedFolderItems.filter(item => {
                  if (itemSearchQuery.trim()) {
                    const q = itemSearchQuery.trim().toLowerCase();
                    const matchSection = (item.sectionNumber || '').toLowerCase().includes(q);
                    const matchTitle = (item.title || '').toLowerCase().includes(q);
                    const matchContent = (item.content || '').toLowerCase().includes(q);
                    if (!matchSection && !matchTitle && !matchContent) return false;
                  }
                  return true;
                }).map(item => {
                  const isItemMastered = item.status === 'mastered' || (typeof item.lastQuality === 'number' && item.lastQuality >= 3);
                  const isItemNeedReview = item.status === 'learning' || item.lastQuality === 1 || item.lastQuality === 2;

                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-law-600 shrink-0">ม. {item.sectionNumber}</span>
                        <div className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs sm:max-w-md">
                          {item.title || item.content?.slice(0, 60)}...
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        {isItemMastered ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🟢 จำได้
                          </span>
                        ) : isItemNeedReview ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            🔴 ยังจำไม่ได้
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            ⚪ รอท่อง
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setAudioPlaylistSession({ items: [item], title: `มาตรา ${item.sectionNumber}` })}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-law-600 hover:text-white transition cursor-pointer"
                          title="ฟังเสียงมาตรานี้"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSession({ items: [item], deckTitle: `ท่องมาตรา ${item.sectionNumber}` })}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-law-600 hover:text-white transition cursor-pointer"
                          title="ท่องมาตรานี้ทันที"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id, item.sectionNumber, selectedFolder.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                          title={`ลบมาตรานี้ออกจาก ${selectedFolder.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Custom Folders Grid View */}
      {activeBookTab === 'custom' && !selectedFolder && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xs">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Folder className="text-amber-600" size={18} />
                <span>โฟลเดอร์ของฉัน (Custom Study Playlists)</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                จัดกลุ่มมาตราที่คุณต้องการเตรียมสอบ สามารถฟังเสียงวนลูปแบบต่อเนื่องและท่องจำแยกตามหมวดหมู่ได้
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewDeckModal(true)}
              className="py-2 px-4 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              <span>สร้างโฟลเดอร์ใหม่</span>
            </button>
          </div>

          {customDecks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Folder size={32} />
              </div>
              <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">ยังไม่มีโฟลเดอร์ส่วนตัว</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                สร้างโฟลเดอร์สำหรับรวมมาตราที่สนใจ เช่น "เนติบัณฑิต ขาอาญา", "สอบอัยการผู้ช่วย", "ทบทวนก่อนสอบ"
              </p>
              <button
                type="button"
                onClick={() => setShowNewDeckModal(true)}
                className="mt-2 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>สร้างโฟลเดอร์แรกของคุณ</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customDecks.map(deck => {
                const deckItems = items.filter(i => i.deckId === deck.id);
                const masteredCount = deckItems.filter(i => i.status === 'mastered' || (typeof i.lastQuality === 'number' && i.lastQuality >= 3)).length;
                const needReviewCount = deckItems.filter(i => i.status === 'learning' || i.lastQuality === 1 || i.lastQuality === 2).length;

                return (
                  <div
                    key={deck.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`w-3.5 h-3.5 rounded-full ${deck.color || 'bg-amber-600'}`} />
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleStartEditDeck(deck)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                            title="แก้ไขชื่อโฟลเดอร์"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeck(deck.id, deck.name)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-500 transition cursor-pointer"
                            title="ลบโฟลเดอร์นี้"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4
                        onClick={() => setSelectedFolderId(deck.id)}
                        className="font-bold text-base text-gray-900 dark:text-white group-hover:text-amber-600 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Folder size={16} className="text-amber-500 shrink-0" />
                        <span className="truncate">{deck.name}</span>
                      </h4>

                      {deck.description ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {deck.description}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">ไม่มีคำอธิบาย</p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          <strong className="text-gray-800 dark:text-gray-200">{deckItems.length}</strong> มาตรา
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {needReviewCount > 0 && (
                            <span className="text-rose-500 font-semibold">ทบทวน {needReviewCount}</span>
                          )}
                          <span className="text-emerald-600 font-semibold">จำได้ {masteredCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(deck.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold transition text-center cursor-pointer"
                        >
                          เปิดดู ({deckItems.length})
                        </button>
                        <button
                          type="button"
                          disabled={deckItems.length === 0}
                          onClick={() => setAudioPlaylistSession({ items: sortMemoItems(deckItems), title: deck.name })}
                          className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40 cursor-pointer shadow-2xs"
                          title="ฟังเสียงอ่านวนลูปทั้งโฟลเดอร์แบบใส่หูฟัง"
                        >
                          <Volume2 size={13} />
                          <span>ฟังวนลูป</span>
                        </button>
                        <button
                          type="button"
                          disabled={deckItems.length === 0}
                          onClick={() => setActiveSession({ items: sortMemoItems(deckItems), deckTitle: deck.name })}
                          className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-600 dark:hover:text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40 cursor-pointer shadow-2xs"
                          title="เริ่มฝึกท่องจำ"
                        >
                          <Brain size={13} />
                          <span>ท่อง</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-law-600" size={18} />
                <span>เพิ่มมาตราเข้าชุดท่อง</span>
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">เลือกกฎหมายฉบับเป้าหมาย</label>
                <select
                  value={addModalTargetBookId}
                  onChange={e => setAddModalTargetBookId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.abbreviation})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ค้นหาเลขมาตรา</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={addModalSearch}
                    onChange={e => setAddModalSearch(e.target.value)}
                    placeholder="พิมพ์เลขมาตรา เช่น 288, 59 หรือข้อความ..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 divide-y divide-gray-100 dark:divide-gray-700">
              {searchedLaws.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  ไม่พบมาตราที่ตรงกับคำค้นหาในฉบับนี้
                </div>
              ) : (
                searchedLaws.map(law => {
                  const targetDeckId = addModalTargetDeckId || `deck-${law.bookId || addModalTargetBookId}`;
                  const alreadyAdded = items.some(i => i.deckId === targetDeckId && i.sectionId === law.id) || addedItemIds.has(law.id);

                  return (
                    <div key={law.id} className="pt-2 pb-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-law-600">ม. {law.sectionNumber}</span>
                          {(law.category || law.bookId) && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                              {law.category ? law.category.split(' > ')[0] : law.bookId}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {law.content}
                        </p>
                      </div>

                      <div className="shrink-0 pt-1">
                        {alreadyAdded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-bold px-2 py-1 rounded bg-green-50 dark:bg-green-950">
                            <CheckCircle2 size={12} /> มีแล้ว
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddSectionToDeck(law)}
                            className="px-3 py-1 rounded-lg bg-law-600 hover:bg-law-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                          >
                            <Plus size={13} />
                            <span>เพิ่ม</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="py-2 px-5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold">สร้างชุดท่องกฎหมายใหม่</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อชุดท่อง *</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  placeholder="เช่น มาตราสำคัญ อาญา ภาค 2, ฎีกาเด็ด ป.วิ.อ."
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={newDeckDesc}
                  onChange={e => setNewDeckDesc(e.target.value)}
                  placeholder="เช่น เตรียมสอบเนติบัณฑิต สมัย 77"
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeckModal(false)}
                  className="py-2 px-4 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-law-600 hover:bg-law-700 text-white text-sm font-bold shadow-md transition"
                >
                  สร้างชุดท่อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deck Modal */}
      {editingDeck && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Edit3 size={18} className="text-amber-600" />
              <span>แก้ไขโฟลเดอร์</span>
            </h3>
            <form onSubmit={handleSaveEditDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อโฟลเดอร์ *</label>
                <input
                  type="text"
                  value={editDeckName}
                  onChange={e => setEditDeckName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={editDeckDesc}
                  onChange={e => setEditDeckDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDeck(null)}
                  className="py-2 px-4 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
