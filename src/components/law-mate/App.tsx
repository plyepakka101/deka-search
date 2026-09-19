import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewState, LawSection, UserNote, AppSettings, LawBook } from './types';
import { getLaws, getNotes, saveNote, saveCustomLaw, deleteCustomLaw, getSettings, saveSettings, getBooks, initLawsData } from './services/dataService';
import { LawCard } from './components/LawCard';
import { LawEditor } from './components/LawEditor';
import { TOCView } from './components/TOCView';
import { Bookshelf } from './components/Bookshelf';
import { MemorizeHub } from './components/MemorizeHub';
import { Home, Search, BookMarked, PlusSquare, Scale, ExternalLink, List, Star, Library, ChevronLeft, Info, Loader2, Brain } from 'lucide-react';
import { normalizeSearchQuery, thaiToArabic } from './utils/textUtils';

import FontSizeController from '@/components/FontSizeController';

const OFFICIAL_SOURCE_URL = 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/cGFqZ1lmZFpjSzUyM3BFY0Z2TVJ0Zz09';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.BOOKSHELF);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  
  const [laws, setLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
  const [isLoading, setIsLoading] = useState(true);
  
  const books = getBooks();
  const activeBook = useMemo(() => books.find(b => b.id === activeBookId), [activeBookId, books]);

  // Initial Data Load
  useEffect(() => {
    initLawsData().then(() => {
      setLaws(getLaws());
      setNotes(getNotes());
      const savedSettings = getSettings();
      setSettings(savedSettings);
      setIsLoading(false);
    });
  }, []);

  // Parse deep link for sharing
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash;
          if (hash.toLowerCase().includes('memorize')) {
              setView(ViewState.MEMORIZE);
              setActiveBookId(null);
              return;
          }
          if (hash.includes('?s=')) {
              const pathPart = hash.split('?')[0]; // e.g. "#/crim_proc"
              const bookIdFromHash = pathPart.replace('#/', '');
              const params = new URLSearchParams(hash.split('?')[1]);
              const section = params.get('s');
              
              if (section) {
                  setTimeout(() => {
                      const targetNum = thaiToArabic(section).replace(/\s+/g, '').toLowerCase();
                      const targetLaw = getLaws().find(l => {
                          if (bookIdFromHash && bookIdFromHash !== '/' && l.bookId !== bookIdFromHash) return false;
                          const lNum = thaiToArabic(l.sectionNumber).replace(/\s+/g, '').toLowerCase();
                          return lNum === targetNum;
                      });
                      if (targetLaw) {
                          if (targetLaw.bookId) setActiveBookId(targetLaw.bookId);
                          setView(ViewState.HOME);
                          setTimeout(() => scrollToSection(targetLaw.id), 100);
                      }
                  }, 500);
              }
          }
      };
      handleHashChange();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [laws]); 

  const handleSaveNote = (note: UserNote) => {
    const updatedNotes = saveNote(note);
    setNotes({...updatedNotes});
  };

  const handleSaveLaw = (newLawData: Omit<LawSection, 'id'> & { id?: string }) => {
    const saved = saveCustomLaw({
      ...newLawData,
      bookId: newLawData.bookId || activeBookId || 'custom'
    });
    setLaws(getLaws()); 
    setView(ViewState.HOME); 
    
    // If we edited a specific law, scroll to it
    setTimeout(() => {
        if(saved.id) scrollToSection(saved.id);
    }, 100);
  };

  const handleDeleteLaw = (id: string) => {
      if(window.confirm('ต้องการคืนค่าเดิม (หรือลบ) กฎหมายข้อนี้ใช่หรือไม่?')) {
          deleteCustomLaw(id);
          setLaws(getLaws());
      }
  }

  const handleCancelEdit = () => {
      // If we were in a book, go back to home, else bookshelf
      if (activeBookId) {
          setView(ViewState.HOME);
      } else {
          setView(ViewState.BOOKSHELF);
      }
  }

  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
  }

  const openOfficialSource = () => {
    const url = activeBook?.sourceUrl || OFFICIAL_SOURCE_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBookSelect = (bookId: string) => {
    setActiveBookId(bookId);
    setView(ViewState.HOME);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBookshelf = () => {
    setActiveBookId(null);
    setView(ViewState.BOOKSHELF);
    setSearchQuery('');
  };

  const scrollToSection = useCallback((id: string) => {
      // Ensure we are in HOME view
      if (view !== ViewState.HOME) {
          setView(ViewState.HOME);
      }
      setSearchQuery(''); 
      
      setTimeout(() => {
          const element = document.getElementById(`section-${id}`);
          if (element) {
              const headerOffset = 90; 
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.scrollY - headerOffset;

              window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
              });

              element.classList.add('ring-2', 'ring-indigo-500', 'shadow-md', 'scale-[1.01]', 'z-10', 'bg-indigo-50/50', 'dark:bg-indigo-950/40');
              
              setTimeout(() => {
                   element.classList.remove('ring-2', 'ring-indigo-500', 'shadow-md', 'scale-[1.01]', 'z-10', 'bg-indigo-50/50', 'dark:bg-indigo-950/40');
              }, 1500);
          }
      }, 200);
  }, [view]);

  const navigateToSectionLabel = useCallback((sectionLabel: string) => {
     const targetNum = thaiToArabic(sectionLabel).replace(/\s+/g, '').toLowerCase();
     
     // Search globally if no active book, or within active book
     const targetLaw = laws.find(l => {
         if (activeBookId && l.bookId !== activeBookId) return false;
         const lNum = thaiToArabic(l.sectionNumber).replace(/\s+/g, '').toLowerCase();
         return lNum === targetNum;
     });

     if (targetLaw) {
         scrollToSection(targetLaw.id);
     }
  }, [laws, activeBookId, scrollToSection]);

  const handleNavigateToLawId = useCallback((lawId: string, bookId: string) => {
      setActiveBookId(bookId);
      scrollToSection(lawId);
  }, [scrollToSection]);

  // Filtering Logic
  const filteredLaws = useMemo(() => {
    // 1. Filter by Book first (unless we want global search features later)
    let scopeLaws = laws;
    if (activeBookId) {
        scopeLaws = laws.filter(l => l.bookId === activeBookId);
    } else {
        if (view === ViewState.BOOKSHELF || view === ViewState.MEMORIZE) return [];
    }

    if (view === ViewState.NOTES) {
      return scopeLaws.filter(law => {
          const note = notes[law.id];
          return note && ((note.text && note.text.trim().length > 0) || (note.linkedDekaIds && note.linkedDekaIds.length > 0));
      });
    }

    if (view === ViewState.HIGHLIGHTS) {
        return scopeLaws.filter(law => notes[law.id]?.isHighlighted);
    }

    if (!searchQuery.trim() && view !== ViewState.SEARCH) {
      return scopeLaws; 
    }
    
    if (!searchQuery.trim() && view === ViewState.SEARCH) {
        return []; 
    }

    const q = normalizeSearchQuery(searchQuery);
    
    return scopeLaws.filter(law => {
      const sectionNum = normalizeSearchQuery(law.sectionNumber);
      const content = normalizeSearchQuery(law.content);
      const category = law.category ? normalizeSearchQuery(law.category) : '';
      return sectionNum.includes(q) || content.includes(q) || category.includes(q);
    });
  }, [laws, notes, searchQuery, view, activeBookId]);

  const NavItem = ({ targetView, icon: Icon, label, onClick }: { targetView?: ViewState, icon: any, label: string, onClick?: () => void }) => (
    <button
      onClick={() => {
          if (onClick) onClick();
          else if (targetView) {
              setView(targetView);
              if(targetView !== ViewState.SEARCH) setSearchQuery('');
          }
      }}
      className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-colors cursor-pointer ${view === targetView ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
    >
      <Icon size={22} strokeWidth={view === targetView ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดฐานข้อมูลกฎหมาย...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-0 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 h-[calc(100vh-4rem)] sticky top-16 z-20">
        <div className="p-5 flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-2xs">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white font-sans leading-tight">
              Thai Law Mate
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              ประมวลกฎหมายไทย
            </span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <button
              onClick={handleBackToBookshelf}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-sans text-sm ${view === ViewState.BOOKSHELF ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs border border-indigo-200/50 dark:border-indigo-800/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
              <Library size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>ห้องสมุดกฎหมาย</span>
          </button>

          <button 
              onClick={() => { setView(ViewState.MEMORIZE); setActiveBookId(null); setSearchQuery(''); }} 
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-sans text-sm ${
                view === ViewState.MEMORIZE 
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold shadow-2xs border border-purple-200/50 dark:border-purple-800/50' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/30'
              }`}
          >
              <Brain size={18} className="text-purple-600 dark:text-purple-400 shrink-0"/>
              <div className="flex items-center justify-between w-full">
                <span>ท่องสอบ (เตรียมสอบ)</span>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">Flashcards</span>
              </div>
          </button>
          
          {activeBookId && (
              <>
                  <div className="pt-3 pb-1 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {activeBook?.abbreviation || 'เมนูเล่มนี้'}
                  </div>
                  {[
                  { v: ViewState.HOME, l: 'เนื้อหาทั้งหมด', i: Home },
                  { v: ViewState.TOC, l: 'สารบัญ', i: List },
                  { v: ViewState.SEARCH, l: 'ค้นหาในเล่ม', i: Search },
                  { v: ViewState.HIGHLIGHTS, l: 'มาตราสำคัญ', i: Star },
                  { v: ViewState.NOTES, l: 'บันทึกของฉัน', i: BookMarked },
                  { v: ViewState.ADD, l: 'แก้ไข/เพิ่มเติม', i: PlusSquare },
                  ].map((item) => (
                  <button
                      key={item.v}
                      onClick={() => {
                          setView(item.v);
                      }}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl transition-all font-sans text-sm ${view === item.v ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                      <item.i size={17} className={view === item.v ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span>{item.l}</span>
                  </button>
                  ))}
                  <button
                      onClick={() => {
                          setView(ViewState.MEMORIZE);
                          setSearchQuery('');
                      }}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl transition-all font-sans text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold`}
                  >
                      <Brain size={17} className="text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>ท่องสอบ ({activeBook?.abbreviation})</span>
                  </button>
              </>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full md:p-6">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xs sticky top-0 z-20 p-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
           {view === ViewState.BOOKSHELF ? (
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView(ViewState.BOOKSHELF)}>
                  <Scale className="text-indigo-600 dark:text-indigo-400" size={22} />
                  <h1 className="text-base font-bold text-slate-900 dark:text-white font-sans">Thai Law Mate</h1>
              </div>
           ) : view === ViewState.MEMORIZE ? (
              <div className="flex items-center space-x-2">
                  <button onClick={handleBackToBookshelf} className="mr-1 text-slate-500">
                      <ChevronLeft size={22} />
                  </button>
                  <div className="flex items-center space-x-2">
                    <Brain className="text-purple-600" size={20} />
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white font-sans">ท่องสอบ (Flashcards)</h1>
                  </div>
              </div>
           ) : (
               <div className="flex items-center space-x-2 overflow-hidden">
                  <button onClick={handleBackToBookshelf} className="mr-1 text-slate-500">
                      <ChevronLeft size={22} />
                  </button>
                  <div className="flex flex-col">
                      <h1 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate max-w-[200px]">
                          {activeBook?.name}
                      </h1>
                      <span className="text-[10px] text-slate-400">{activeBook?.abbreviation}</span>
                  </div>
               </div>
           )}
        </header>

          {/* Dynamic Header / Title Bar */}
          {view !== ViewState.BOOKSHELF && view !== ViewState.MEMORIZE && activeBook && view !== ViewState.ADD && (
             <div className="p-4 md:p-0 md:mb-6 sticky md:static top-[60px] z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur md:bg-transparent font-sans">
                {view === ViewState.HOME && (
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white hidden md:block">{activeBook.name}</h2>
                                {activeBook.lastUpdated && (
                                    <div className="flex items-center space-x-1 text-xs text-slate-400 mt-1">
                                        <Info size={12} />
                                        <span>ข้อมูล ณ วันที่ {activeBook.lastUpdated}</span>
                                    </div>
                                )}
                             </div>
                             
                              <div className="flex items-center gap-2">
                                <button 
                                   onClick={() => setView(ViewState.MEMORIZE)}
                                   className="flex items-center space-x-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2.5 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors font-semibold shadow-2xs"
                                   title="เข้าสู่โหมดท่องจำเพื่อเตรียมสอบ"
                                >
                                   <Brain size={14} className="text-purple-600 dark:text-purple-400" />
                                   <span>ท่องสอบฉบับนี้</span>
                                </button>
                                <div className="hidden md:block"><FontSizeController /></div>
                               <button 
                                  onClick={openOfficialSource}
                                  className="hidden md:flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors border border-indigo-200/40"
                              >
                                  <span>ฉบับล่าสุดจากกฤษฎีกา</span>
                                  <ExternalLink size={11} />
                               </button>
                             </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 md:mt-0">เรียกดูมาตราทั้งหมด ({filteredLaws.length} มาตรา)</p>
                    </div>
                    
                     {/* Mobile Only Official Link */}
                     <div className="md:hidden flex flex-col gap-2">
                        <FontSizeController />
                        <button 
                                onClick={openOfficialSource}
                                className="flex w-full justify-center items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200/50"
                            >
                                <span>ตรวจสอบฉบับล่าสุดจากกฤษฎีกา</span>
                                <ExternalLink size={12} />
                        </button>
                     </div>
                </div>
                )}
                
                {view === ViewState.NOTES && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">บันทึกของฉัน</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{activeBook.abbreviation} - {filteredLaws.length} รายการ</p>
                </div>
                )}
                
                {view === ViewState.HIGHLIGHTS && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-yellow-600 dark:text-yellow-400 flex items-center">
                        <Star className="mr-2 text-amber-500" fill="currentColor" />
                        รายการสำคัญ
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{activeBook.abbreviation} - {filteredLaws.length} รายการ</p>
                </div>
                )}

                {view === ViewState.TOC && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">สารบัญ</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">เลือกหัวข้อเพื่อไปยังส่วนที่ต้องการ</p>
                </div>
                )}

                {view === ViewState.SEARCH && (
                <div className="relative">
                    <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`ค้นหาใน ${activeBook.abbreviation} (เช่น 288) หรือ ข้อความ...`}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-white bg-white dark:bg-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={20} />
                </div>
                )}
            </div>
          )}
          
          {view === ViewState.BOOKSHELF && (
             <div className="p-4 md:p-0 md:mb-8">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center md:text-left">ห้องสมุดกฎหมาย</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-center md:text-left mt-1 text-sm">เลือกประมวลกฎหมายหรือ พ.ร.บ. ที่ต้องการศึกษาและค้นหา</p>
             </div>
          )}

          {/* Content Feed */}
          <div className="px-4 md:px-0 space-y-4">
            {view === ViewState.BOOKSHELF && (
                <Bookshelf books={books} laws={laws} onSelectBook={handleBookSelect} />
            )}

            {view === ViewState.MEMORIZE && (
                <MemorizeHub settings={settings} />
            )}

            {view === ViewState.ADD && (
              <LawEditor 
                initialBookId={activeBookId}
                onSave={handleSaveLaw} 
                onCancel={handleCancelEdit}
              />
            )}
            
            {view === ViewState.TOC && (
               <TOCView laws={filteredLaws} onNavigate={scrollToSection} />
            )}
            
            {(view === ViewState.HOME || view === ViewState.SEARCH || view === ViewState.NOTES || view === ViewState.HIGHLIGHTS) && (
              <>
                {filteredLaws.length > 0 ? (
                  filteredLaws.map(law => (
                    <LawCard
                      key={law.id}
                      law={law}
                      note={notes[law.id]}
                      settings={settings}
                      onSaveNote={handleSaveNote}
                      onDeleteLaw={handleDeleteLaw}
                      onNavigateToSection={navigateToSectionLabel}
                      onNavigateToLawId={handleNavigateToLawId}
                      officialUrl={activeBook?.sourceUrl || OFFICIAL_SOURCE_URL}
                      searchQuery={view === ViewState.SEARCH ? searchQuery : ''}
                    />
                  ))
                ) : (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8">
                    <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {view === ViewState.SEARCH ? <Search className="text-slate-400" size={30}/> : 
                       view === ViewState.HIGHLIGHTS ? <Star className="text-amber-400" size={30} /> :
                       <BookMarked className="text-slate-400" size={30} />}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-sans text-sm">
                      {view === ViewState.SEARCH 
                        ? (searchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "พิมพ์เพื่อเริ่มค้นหา") 
                        : view === ViewState.NOTES 
                          ? "คุณยังไม่มีบันทึกในเล่มนี้" 
                          : view === ViewState.HIGHLIGHTS 
                          ? "คุณยังไม่ได้เน้นข้อความสำคัญในเล่มนี้"
                          : "ไม่พบข้อมูลกฎหมาย"}
                    </p>
                     {view === ViewState.SEARCH && searchQuery && (
                        <button 
                            onClick={openOfficialSource}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold"
                        >
                            ค้นหาต่อในฐานข้อมูลกฤษฎีกา
                        </button>
                     )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex justify-around items-center px-2 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {activeBookId ? (
                <>
                    <NavItem targetView={ViewState.HOME} icon={Home} label="เนื้อหา" />
                    <NavItem targetView={ViewState.TOC} icon={List} label="สารบัญ" />
                    <NavItem targetView={ViewState.HIGHLIGHTS} icon={Star} label="สำคัญ" />
                    <NavItem targetView={ViewState.SEARCH} icon={Search} label="ค้นหา" />
                </>
            ) : (
                  // Simple nav for bookshelf / memorize view
                  <>
                    <NavItem targetView={ViewState.BOOKSHELF} icon={Library} label="ห้องสมุด" />
                    <NavItem targetView={ViewState.MEMORIZE} icon={Brain} label="ท่องสอบ" />
                  </>
             )}
        </nav>
      </div>
  );
};

export default App;