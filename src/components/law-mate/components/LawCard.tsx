import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LawSection, UserNote, AppSettings, TextHighlight } from '../types';
import { getOriginalLaw, getBooks } from '../services/dataService';
import { BookOpen, Edit, Save, Trash2, ExternalLink, Star, Share2, Volume2, Square, Scale, History, Search, Highlighter, X, Brain, Play, GraduationCap, ChevronRight } from 'lucide-react';
import { SECTION_REF_REGEX, thaiToArabic, createHighlightRegex } from '../utils/textUtils';
import { DiffView } from './DiffView';
import { MemorizePlayer } from './MemorizePlayer';
import { addSectionToDeck, removeItem, getLocalItems, onMemorizeDataChanged } from '../services/memorizeService';

interface LawCardProps {
  law: LawSection;
  note?: UserNote;
  settings: AppSettings;
  onSaveNote: (note: UserNote) => void;
  onDeleteLaw?: (id: string) => void;
  onNavigateToSection?: (sectionLabel: string) => void;
  onNavigateToLawId?: (lawId: string, bookId: string) => void;
  officialUrl?: string;
  searchQuery?: string;
}

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red';

export const LawCard: React.FC<LawCardProps> = ({ law, note, settings, onSaveNote, onDeleteLaw, onNavigateToSection, onNavigateToLawId, officialUrl, searchQuery }) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const initialNoteText = (note && note.text) ? note.text : '';
  const [noteText, setNoteText] = useState(initialNoteText);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Diff State
  const [showDiff, setShowDiff] = useState(false);
  const originalContent = law.isCustom ? getOriginalLaw(law.id)?.content : null;
  const hasChanges = law.isCustom && originalContent && originalContent !== law.content;
  
  // Refs for TTS management
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isLoopingRef = useRef(false);

  // Highlighting State
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, start: number, end: number, isExisting?: boolean } | null>(null);

  const isHighlighted = note?.isHighlighted || false;
  const hasTextHighlights = note?.textHighlights && note.textHighlights.length > 0;

  // Linked Decisions
  const [linkedDecisions, setLinkedDecisions] = useState<any[]>([]);
  const [showLinkedDecisions, setShowLinkedDecisions] = useState(false);

  // Related Exam Questions
  const [relatedExams, setRelatedExams] = useState<any[]>([]);
  const [showRelatedExams, setShowRelatedExams] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [hasFetchedExams, setHasFetchedExams] = useState(false);

  const handleToggleRelatedExams = async () => {
    if (!showRelatedExams && !hasFetchedExams) {
      setIsLoadingExams(true);
      try {
        const res = await fetch(`/api/exams/by-law?section=${encodeURIComponent(law.sectionNumber)}`);
        const data = await res.json();
        if (data.success) {
          setRelatedExams(data.questions || []);
        }
      } catch (e) {
        console.error("Failed to fetch related exams", e);
      } finally {
        setIsLoadingExams(false);
        setHasFetchedExams(true);
      }
    }
    setShowRelatedExams(!showRelatedExams);
  };

  // Memorization State
  const [memoItems, setMemoItems] = useState(getLocalItems());
  const [showQuickMemorizeModal, setShowQuickMemorizeModal] = useState(false);

  useEffect(() => {
    return onMemorizeDataChanged(() => {
      setMemoItems(getLocalItems());
    });
  }, []);

  const existingMemoItem = memoItems.find(i => i.sectionId === law.id);
  const isInMemo = Boolean(existingMemoItem);

  const handleToggleMemorize = async () => {
    if (existingMemoItem) {
      if (window.confirm(`ต้องการนำมาตรา ${law.sectionNumber} ออกจากชุดท่องสอบหรือไม่?`)) {
        await removeItem(existingMemoItem.id);
      }
      return;
    }
    const targetDeckId = `deck-${law.bookId || 'crim'}`;
    await addSectionToDeck(targetDeckId, law.id, `มาตรา ${law.sectionNumber}`);
  };

  const handleOpenQuickMemorize = async () => {
    if (!existingMemoItem) {
      const targetDeckId = `deck-${law.bookId || 'crim'}`;
      await addSectionToDeck(targetDeckId, law.id, `มาตรา ${law.sectionNumber}`);
    }
    setShowQuickMemorizeModal(true);
  };

  useEffect(() => {
    if (note?.linkedDekaIds && note.linkedDekaIds.length > 0) {
      const fetchDecisions = async () => {
        try {
          const res = await fetch(`/api/decisions?ids=${note.linkedDekaIds!.join(',')}`);
          if (res.ok) {
            const data = await res.json();
            setLinkedDecisions(data);
          }
        } catch (e) {
          console.error('Failed to fetch linked decisions', e);
        }
      };
      fetchDecisions();
    } else {
      setLinkedDecisions([]);
    }
  }, [note?.linkedDekaIds]);

  // Stop TTS when law changes or component unmounts
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    isLoopingRef.current = false;
  }, [law.id]);

  useEffect(() => {
    // Warm up voices
    const loadVoices = () => {
        window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Sync noteText with prop changes
  useEffect(() => {
      setNoteText(note?.text || '');
  }, [note]);

  // Clear selection menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionMenu && contentRef.current && !contentRef.current.contains(e.target as Node)) {
         const menuEl = document.getElementById('highlight-menu');
         if (menuEl && menuEl.contains(e.target as Node)) return;
         
         setSelectionMenu(null);
         window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu]);

  const fontFamilyClass = settings.fontStyle === 'traditional' ? 'font-serif' : 'font-sans';

  const handleSaveNote = (overrideNoteText?: string, overrideHighlights?: TextHighlight[], overrideIsHighlighted?: boolean, overrideLinkedDekaIds?: string[]) => {
    onSaveNote({
      sectionId: law.id,
      text: overrideNoteText !== undefined ? overrideNoteText : noteText,
      updatedAt: Date.now(),
      isHighlighted: overrideIsHighlighted !== undefined ? overrideIsHighlighted : isHighlighted,
      textHighlights: overrideHighlights !== undefined ? overrideHighlights : note?.textHighlights,
      linkedDekaIds: overrideLinkedDekaIds !== undefined ? overrideLinkedDekaIds : note?.linkedDekaIds
    });
    if (overrideNoteText === undefined) setIsEditingNote(false);
  };

  const toggleHighlight = () => {
      handleSaveNote(undefined, undefined, !isHighlighted);
  };

  const handleSearchDika = () => {
      const books = getBooks();
      const currentBook = books.find(b => b.id === law.bookId);
      let lawName = currentBook ? currentBook.name : '';
      if (!lawName && law.category) {
          lawName = law.category.split(' > ')[0];
      }
      const cleanSection = thaiToArabic(law.sectionNumber).trim().replace(/\s+/g, '');
      window.location.href = `/search?tab=law&law_name=${encodeURIComponent(lawName)}&section=${encodeURIComponent(cleanSection)}`;
  }

  const startReading = useCallback(() => {
    const cleanSection = thaiToArabic(law.sectionNumber);
    // Remove citation brackets like [1] from speech
    const cleanContent = law.content.replace(/\[\d+\]/g, '');
    const textToRead = `มาตรา ${cleanSection}. ${cleanContent}`;
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = settings.speakingRate || 1.0;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    // If user selected a specific voice, try to find it
    if (settings.voiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
    }

    // If no specific voice selected or found, try to find a Thai voice
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'th-TH') || voices.find(v => v.lang.includes('th'));
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    } else {
        // If still no voice, leave it default (browser default) but set lang just in case
        utterance.lang = 'th-TH';
    }

    utterance.onstart = () => {
        setIsPlaying(true);
    };

    utterance.onend = () => {
        if (isLoopingRef.current) {
            startReading(); // Loop again
        } else {
            setIsPlaying(false);
            utteranceRef.current = null;
        }
    };

    utterance.onerror = (e: any) => {
        // Filter out canceled/interrupted errors which are normal
        if (e.error === 'canceled' || e.error === 'interrupted') {
            setIsPlaying(false);
            utteranceRef.current = null;
            return;
        }
        
        console.error('TTS Error:', e.error);
        // Prevent alert loop
        if (!isLoopingRef.current) {
            alert(`เกิดข้อผิดพลาดในการอ่านออกเสียง: ${e.error}`);
        }
        
        setIsPlaying(false);
        utteranceRef.current = null;
        isLoopingRef.current = false;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [law, settings.voiceURI, settings.speakingRate]);

  const handlePlayTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง');
      return;
    }

    if (isPlaying) {
      isLoopingRef.current = false;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Stop any current speech before starting
      window.speechSynthesis.cancel();
      isLoopingRef.current = true;
      startReading();
    }
  };

  const handleShare = async () => {
    const textToShare = `มาตรา ${law.sectionNumber}\n${law.content}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `มาตรา ${law.sectionNumber}`,
          text: textToShare,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        alert('คัดลอกเนื้อหาและโน้ตเรียบร้อยแล้ว');
      } catch (err) {
        alert('ไม่สามารถคัดลอกได้');
      }
    }
  };

  // --- Text Selection & Highlighting Logic ---

  const getParagraphOffset = (pNode: HTMLElement, targetNode: Node, targetOffset: number) => {
      const range = document.createRange();
      range.selectNodeContents(pNode);
      range.setEnd(targetNode, targetOffset);
      let pOffset = range.toString().length;
      
      // Check for prefix in first paragraph
      const prefixSpan = pNode.querySelector('.law-section-prefix');
      if (prefixSpan) {
          const prefixLen = prefixSpan.textContent?.length || 0;
          pOffset -= prefixLen;
      }
      return Math.max(0, pOffset);
  };

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    // Prevent interfering with highlight click
    if ((e.target as HTMLElement).closest('[data-highlight="true"]')) {
        return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = contentRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      setSelectionMenu(null);
      return;
    }

    // Find start and end paragraphs by traversing up from text nodes
    const findP = (node: Node): HTMLElement | null => {
        let curr: Node | null = node;
        while(curr && curr !== container) {
            if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName === 'P' && (curr as HTMLElement).hasAttribute('data-index')) {
                return curr as HTMLElement;
            }
            curr = curr.parentNode;
        }
        return null;
    };

    const startP = findP(range.startContainer);
    const endP = findP(range.endContainer);

    if (!startP || !endP) {
         setSelectionMenu(null);
         return;
    }

    const startPIndex = parseInt(startP.getAttribute('data-index') || '0');
    const endPIndex = parseInt(endP.getAttribute('data-index') || '0');

    const startPOffset = getParagraphOffset(startP, range.startContainer, range.startOffset);
    const endPOffset = getParagraphOffset(endP, range.endContainer, range.endOffset);

    // Calculate global offsets based on law.content structure (split by \n)
    const lines = law.content.split('\n');
    
    const getGlobalOffset = (pIndex: number, pOffset: number) => {
        let global = 0;
        for(let i=0; i<pIndex; i++) {
            global += lines[i].length + 1; // +1 for the newline char
        }
        return global + pOffset;
    };

    const start = getGlobalOffset(startPIndex, startPOffset);
    const end = getGlobalOffset(endPIndex, endPOffset);

    if (start >= end) {
        setSelectionMenu(null);
        return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to the card content container
    const relativeX = (rect.left + rect.width / 2) - containerRect.left;
    const relativeY = rect.top - containerRect.top;

    setSelectionMenu({
      x: relativeX,
      y: relativeY,
      start,
      end,
      isExisting: false
    });

  }, [law.content]);

  const handleHighlightClick = (e: React.MouseEvent, highlight: TextHighlight) => {
      e.stopPropagation();
      if (!contentRef.current) return;
      
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const containerRect = contentRef.current.getBoundingClientRect();
      
      const relativeX = (rect.left + rect.width / 2) - containerRect.left;
      const relativeY = rect.top - containerRect.top;

      setSelectionMenu({
          x: relativeX,
          y: relativeY,
          start: highlight.start,
          end: highlight.end,
          isExisting: true
      });
  };

  const addHighlight = (color: HighlightColor) => {
      if (!selectionMenu) return;
      
      const newHighlight: TextHighlight = {
          start: selectionMenu.start,
          end: selectionMenu.end,
          color
      };
      
      const currentHighlights = note?.textHighlights || [];
      // Remove overlaps
      const updatedHighlights = currentHighlights.filter(h => 
          !(h.start < newHighlight.end && h.end > newHighlight.start)
      );
      
      updatedHighlights.push(newHighlight);
      updatedHighlights.sort((a, b) => a.start - b.start);

      handleSaveNote(undefined, updatedHighlights);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  const clearHighlightSelection = () => {
      if (!selectionMenu) return;
      
      const currentHighlights = note?.textHighlights || [];
      const updatedHighlights = currentHighlights.filter(h => 
          !(h.start < selectionMenu.end && h.end > selectionMenu.start)
      );
      
      handleSaveNote(undefined, updatedHighlights);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  const clearAllHighlights = () => {
      if(confirm('ต้องการลบไฮไลท์ทั้งหมดในมาตรานี้ใช่หรือไม่?')) {
          handleSaveNote(undefined, []);
      }
  };

  // --- Advanced Rendering Logic ---

  const getBgClass = (color: string) => {
      switch(color) {
          case 'yellow': return 'bg-yellow-200 dark:bg-yellow-700/50';
          case 'green': return 'bg-green-200 dark:bg-green-700/50';
          case 'blue': return 'bg-blue-200 dark:bg-blue-700/50';
          case 'pink': return 'bg-pink-200 dark:bg-pink-700/50';
          case 'red': return 'bg-red-200 dark:bg-red-700/50';
          default: return 'bg-yellow-200 dark:bg-yellow-700/50';
      }
  };

  const renderContentWithFeatures = () => {
      const text = law.content;
      const highlights = note?.textHighlights || [];
      const paragraphs = text.split('\n');
      
      let globalOffset = 0;

      return paragraphs.map((paraText, pIndex) => {
          const paraStart = globalOffset;
          const paraEnd = globalOffset + paraText.length;
          
          interface Segment {
              start: number;
              end: number;
              type: 'text' | 'highlight' | 'search' | 'link';
              data?: any;
          }
          
          let segments: Segment[] = [];

          // 1. User Highlights
          highlights.forEach(h => {
              const start = Math.max(h.start, paraStart);
              const end = Math.min(h.end, paraEnd);
              if (start < end) {
                  segments.push({ start: start - paraStart, end: end - paraStart, type: 'highlight', data: { color: h.color, original: h } });
              }
          });

          // 2. Search Query
          if (searchQuery && searchQuery.trim()) {
              const regex = createHighlightRegex(searchQuery);
              if (regex) {
                  let match;
                  while ((match = regex.exec(paraText)) !== null) {
                      segments.push({ 
                          start: match.index, 
                          end: match.index + match[0].length, 
                          type: 'search' 
                      });
                  }
              }
          }

          // 3. Section Links
          const linkRegex = new RegExp(SECTION_REF_REGEX.source, 'g');
          let match;
          while ((match = linkRegex.exec(paraText)) !== null) {
              segments.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  type: 'link',
                  data: match[1]
              });
          }

          segments.sort((a, b) => a.start - b.start);

          const points = new Set<number>([0, paraText.length]);
          segments.forEach(s => {
              points.add(s.start);
              points.add(s.end);
          });
          const sortedPoints = Array.from(points).sort((a, b) => a - b);
          
          const renderSegments: React.ReactNode[] = [];
          
          for (let i = 0; i < sortedPoints.length - 1; i++) {
              const pStart = sortedPoints[i];
              const pEnd = sortedPoints[i + 1];
              const segmentText = paraText.substring(pStart, pEnd);
              
              const activeHighlight = segments.find(s => s.type === 'highlight' && s.start <= pStart && s.end >= pEnd);
              const activeSearch = (searchQuery && searchQuery.trim()) ? segments.find(s => s.type === 'search' && s.start <= pStart && s.end >= pEnd) : undefined;
              const activeLink = segments.find(s => s.type === 'link' && s.start <= pStart && s.end >= pEnd);

              let element: React.ReactNode = segmentText;

              if (activeLink) {
                  element = (
                      <span 
                        className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline decoration-indigo-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToSection) onNavigateToSection(activeLink.data);
                        }}
                      >
                          {element}
                      </span>
                  );
              }

              if (activeSearch) {
                  element = (
                      <span className="bg-yellow-400/50 dark:bg-yellow-600/80 rounded px-0.5 text-black dark:text-white">
                          {element}
                      </span>
                  );
              }

              if (activeHighlight) {
                  element = (
                      <span 
                        data-highlight="true"
                        className={`${getBgClass(activeHighlight.data.color)} rounded-sm decoration-clone box-decoration-clone pb-0.5 cursor-pointer hover:brightness-95 dark:hover:brightness-110`}
                        onClick={(e) => handleHighlightClick(e, activeHighlight.data.original)}
                      >
                          {element}
                      </span>
                  );
              }

              renderSegments.push(<React.Fragment key={i}>{element}</React.Fragment>);
          }

          globalOffset += paraText.length + 1; // +1 for newline

          return (
            <p key={pIndex} data-index={pIndex} className="indent-8 md:indent-10 mb-2 text-justify break-words whitespace-pre-wrap relative">
                {pIndex === 0 && (
                    <span 
                      className={`law-section-prefix font-bold inline mr-3 ${onNavigateToLawId || onNavigateToSection ? 'cursor-pointer hover:underline text-indigo-700 dark:text-indigo-300' : ''}`}
                      onClick={() => {
                        if (onNavigateToLawId) {
                          onNavigateToLawId(law.id, law.bookId as string);
                        } else if (onNavigateToSection && law.sectionNumber) {
                          onNavigateToSection(law.sectionNumber as string);
                        }
                      }}
                    >
                     มาตรา {law.sectionNumber}
                    </span>
                )}
                {renderSegments}
            </p>
          );
      });
  };

  const hasNoteContent = note && note.text && note.text.length > 0;

  return (
    <div 
      id={`section-${law.id}`} 
      className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border overflow-visible mb-5 transition-all duration-300 hover:shadow-xs group/card 
        ${isHighlighted 
            ? 'border-amber-400 ring-1 ring-amber-100 dark:border-amber-500/50 dark:ring-amber-900/20' 
            : 'border-slate-200/80 dark:border-slate-800'}`}
    >
      {/* Highlight Indicator Strip */}
      {isHighlighted && (
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 dark:bg-amber-500 rounded-l-2xl"></div>
      )}

      {/* Highlight Menu Popover */}
      {selectionMenu && (
          <div 
            id="highlight-menu"
            className="absolute z-50 flex items-center bg-gray-900 dark:bg-gray-700 rounded-full shadow-xl px-2 py-1.5 -translate-x-1/2 transform transition-all animate-in fade-in zoom-in duration-200"
            style={{ 
                left: selectionMenu.x, 
                top: selectionMenu.y - 45 
            }}
          >
              <div className="flex space-x-1">
                  <button onClick={() => addHighlight('yellow')} className="w-6 h-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('green')} className="w-6 h-6 rounded-full bg-green-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('blue')} className="w-6 h-6 rounded-full bg-blue-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('pink')} className="w-6 h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  {(selectionMenu.isExisting) && (
                    <>
                        <div className="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                        <button onClick={clearHighlightSelection} className="p-1 text-gray-300 hover:text-red-400 hover:scale-110 transition-transform" title="ลบไฮไลท์นี้">
                            <Trash2 size={14} />
                        </button>
                    </>
                  )}
                  <div className="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                  <button onClick={() => { setSelectionMenu(null); window.getSelection()?.removeAllRanges(); }} className="p-1 text-gray-400 hover:text-white">
                      <X size={14} />
                  </button>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
          </div>
      )}

      {/* Minimal Header for Actions & Metadata */}
      <div className={`px-6 pt-4 flex justify-between items-start transition-colors ${isHighlighted ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
        <div className="flex-1 min-w-0 mr-4">
           <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {law.category && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium truncate font-sans">
                        {law.category}
                    </span>
                )}
                {law.isCustom && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center space-x-1 ${hasChanges ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`}>
                        <span>{hasChanges ? 'แก้ไขแล้ว' : 'กำหนดเอง'}</span>
                    </span>
                )}
                {isInMemo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1 shadow-xs">
                        <Brain size={11} />
                        <span>ในชุดท่องสอบ</span>
                    </span>
                )}
           </div>
        </div>
        
        <div className="flex space-x-2">
            <button 
                onClick={toggleHighlight}
                className={`p-1 transition-all duration-200 hover:scale-110 active:scale-90 ${isHighlighted ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}`}
                title={isHighlighted ? "เลิกเน้นข้อความ" : "เน้นข้อความสำคัญ"}
            >
                <Star size={20} fill={isHighlighted ? "currentColor" : "none"} />
            </button>
            
           {law.isCustom && onDeleteLaw && (
              <button onClick={() => onDeleteLaw(law.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90" title="คืนค่าเดิม / ลบ">
                  <Trash2 size={14} />
              </button>
           )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`px-4 md:px-8 pb-6 pt-2 ${isHighlighted ? 'bg-yellow-50/10 dark:bg-yellow-900/5' : ''}`}>
        
        {/* Diff Toggle Bar */}
        {hasChanges && (
            <div className="mb-4 flex items-center justify-end">
                 <button 
                    onClick={() => setShowDiff(!showDiff)}
                    className={`text-xs flex items-center px-2 py-1 rounded transition-all duration-200 hover:scale-105 active:scale-95 ${showDiff ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}
                 >
                    <History size={12} className="mr-1" />
                    {showDiff ? 'ซ่อนการแก้ไข' : 'ดูสิ่งที่แก้ไข'}
                 </button>
            </div>
        )}

        {showDiff && originalContent ? (
            <div className="mb-4">
                <div className="text-sm text-slate-500 mb-1">เปรียบเทียบกับต้นฉบับ:</div>
                <DiffView original={originalContent} modified={law.content} />
            </div>
        ) : (
            <div 
                ref={contentRef}
                onMouseUp={handleTextSelection}
                className={`text-slate-900 dark:text-slate-100 ${fontFamilyClass} selection:bg-indigo-100 dark:selection:bg-indigo-900`}
                style={{ fontSize: 'var(--content-font-size, 16px)', lineHeight: settings.lineHeight || 1.8 }}
            >
                {renderContentWithFeatures()}
            </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 font-sans">
          <button 
            onClick={() => setIsEditingNote(!isEditingNote)}
            className={`flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isEditingNote || hasNoteContent ? 'text-indigo-700 bg-indigo-50 border border-indigo-200/60 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Edit size={15} />
            <span>{hasNoteContent ? 'แก้ไขโน้ต' : 'โน้ต'}</span>
          </button>
          
          {hasTextHighlights && (
            <button
              onClick={clearAllHighlights}
              className="flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="ลบไฮไลท์ทั้งหมด"
            >
              <Highlighter size={15} />
              <span>ลบไฮไลท์</span>
            </button>
          )}

          <button
            onClick={handleSearchDika}
             className="flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
             title="ค้นหาคำพิพากษาศาลฎีกา"
          >
            <Search size={15} />
            <span>ค้นหาฎีกา</span>
          </button>

          {linkedDecisions.length > 0 && (
            <button 
              onClick={() => setShowLinkedDecisions(!showLinkedDecisions)}
              className={`flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${showLinkedDecisions ? 'text-indigo-700 bg-indigo-50 border border-indigo-200/60 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="แสดง/ซ่อนฎีกาที่บันทึกไว้"
            >
              <Scale size={15} />
              <span>ฎีกาที่บันทึกไว้ ({linkedDecisions.length})</span>
            </button>
          )}

          <button 
            onClick={handlePlayTTS}
            className={`flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isPlaying ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {isPlaying ? <Square size={15} fill="currentColor" /> : <Volume2 size={15} />}
            <span>{isPlaying ? 'หยุด' : 'ฟังเสียง'}</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Share2 size={15} />
            <span>แชร์</span>
          </button>

          {/* Memorization (ท่องสอบ) Button Group */}
          <div className="inline-flex items-center rounded-xl border border-purple-200 dark:border-purple-800/60 overflow-hidden shadow-2xs">
            <button 
              onClick={handleToggleMemorize}
              className={`flex items-center space-x-1.5 text-xs sm:text-sm px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                isInMemo 
                  ? 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/80 font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800'
              }`}
              title={isInMemo ? "มาตรานี้อยู่ในชุดท่องสอบแล้ว (คลิกเพื่อนำออก)" : "เพิ่มมาตรานี้เข้าสู่ชุดท่องสอบ"}
            >
              <Brain size={15} className={isInMemo ? "text-purple-600 dark:text-purple-400" : ""} />
              <span>{isInMemo ? 'ท่องสอบ ⭐' : 'เพิ่มในท่องสอบ'}</span>
            </button>

            <button
              onClick={handleOpenQuickMemorize}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 text-xs font-semibold border-l border-purple-200 dark:border-purple-800/60 transition flex items-center gap-1 cursor-pointer"
              title="เริ่มฝึกท่องจำมาตรานี้ทันที (เลือกได้ทั้ง 4 โหมด)"
            >
              <Play size={12} />
              <span>เริ่มท่อง</span>
            </button>
          </div>

          {/* Related Exams Button */}
          <button 
            onClick={handleToggleRelatedExams}
            className={`flex items-center space-x-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              showRelatedExams 
                ? 'text-indigo-800 bg-indigo-100 border-indigo-300 dark:text-indigo-200 dark:bg-indigo-950 font-bold' 
                : 'text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200/70 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800/60 font-semibold'
            }`}
            title="ค้นหาข้อสอบที่เกี่ยวข้องกับมาตรานี้"
          >
            <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>{hasFetchedExams ? `ข้อสอบ (${relatedExams.length})` : 'ข้อสอบ'}</span>
          </button>

          {(law.sourceUrl || officialUrl) && (
            <a 
              href={law.sourceUrl || officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all duration-200 hover:scale-105 active:scale-95 ml-auto cursor-pointer"
              title="ตรวจสอบกับต้นฉบับ"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Note Editor Area */}
        {(isEditingNote || hasNoteContent) && (
          <div className={`mt-4 ${isEditingNote ? 'block' : hasNoteContent ? 'block' : 'hidden'}`}>
            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="บันทึกข้อความ..."
                  className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base min-h-[100px] resize-none outline-none font-sarabun"
                />
                <div className="flex justify-end space-x-2 font-sans">
                  <button 
                    onClick={() => {
                        setIsEditingNote(false);
                        setNoteText((note && note.text) ? note.text : '');
                    }}
                    className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={() => handleSaveNote()}
                    className="bg-indigo-600 text-white text-xs sm:text-sm px-4 py-1.5 rounded-xl shadow-2xs hover:bg-indigo-700 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer font-semibold"
                  >
                    <Save size={14} />
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingNote(true)}
                className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-all duration-200 hover:shadow-xs group relative shadow-2xs"
              >
                 <div className="flex items-start space-x-3">
                    <BookOpen className="text-amber-700 dark:text-amber-400 mt-1 flex-shrink-0" size={18} />
                    <p className="text-amber-950 dark:text-amber-200 text-base font-sarabun leading-relaxed">{note ? note.text : ''}</p>
                 </div>
                 <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-amber-800 bg-amber-200/80 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-md font-sans transition-opacity">แก้ไข</span>
              </div>
            )}
          </div>
        )}

        {/* Linked Decisions Area */}
        {linkedDecisions.length > 0 && showLinkedDecisions && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <span className="mr-1.5">📌</span> ฎีกาที่น่าสนใจในมาตรานี้
            </h4>
            <div className="space-y-3 font-sans">
              {linkedDecisions.map(decision => (
                <div key={decision.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                    <a href={`/decision/${decision.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
                      คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                    </a>
                    <button 
                      onClick={() => {
                        const newLinks = (note?.linkedDekaIds || []).filter(id => id !== decision.id);
                        handleSaveNote(undefined, undefined, undefined, newLinks);
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                      title="เอาออก"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {decision.decisionYear && (
                    <div className="text-xs text-slate-500 mb-1">
                      ปี {decision.decisionYear} {decision.parties ? `· ${decision.parties}` : ''}
                    </div>
                  )}
                  {decision.shortSummary && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      {decision.shortSummary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Exam Questions Area */}
        {showRelatedExams && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-sans">
                <GraduationCap className="text-indigo-600 dark:text-indigo-400 w-4 h-4" />
                <span>ข้อสอบอัตนัยที่เกี่ยวข้องกับมาตรา {law.sectionNumber}</span>
              </h4>
              <button
                onClick={() => setShowRelatedExams(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="ปิด"
              >
                <X size={14} />
              </button>
            </div>

            {isLoadingExams ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 font-sans">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>กำลังค้นหาข้อสอบที่เกี่ยวข้อง...</span>
              </div>
            ) : relatedExams.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 font-sans">
                ยังไม่มีข้อสอบที่อ้างอิงมาตรา {law.sectionNumber} ในคลังระบบขณะนี้
              </div>
            ) : (
              <div className="space-y-2.5 font-sans">
                {relatedExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-colors shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[11px] rounded shadow-2xs">
                          ข้อ {exam.questionNumber}
                        </span>
                        <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                          {exam.category} {exam.examYear ? `(ปี ${exam.examYear})` : ''}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {exam.collectionTitle || exam.title || `ข้อสอบข้อ ${exam.questionNumber}`}
                      </p>
                      {exam.factsPreview && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {exam.factsPreview}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/exams/${exam.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>เริ่มทำข้อสอบ</span>
                      <ChevronRight size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Quick Memorize Modal Dialog */}
      {showQuickMemorizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-8">
            <MemorizePlayer
              items={[
                existingMemoItem || {
                  id: `deck-${law.bookId || 'crim'}_${law.id}`,
                  deckId: `deck-${law.bookId || 'crim'}`,
                  sectionId: law.id,
                  title: `มาตรา ${law.sectionNumber}`,
                  sectionNumber: law.sectionNumber,
                  content: law.content,
                  bookId: law.bookId,
                  repetitions: 0,
                  intervalDays: 1,
                  easeFactor: 2.5,
                  streak: 0,
                  status: 'new'
                }
              ]}
              deckTitle={`ท่องจำมาตรา ${law.sectionNumber}`}
              settings={settings}
              onFinish={() => setShowQuickMemorizeModal(false)}
              onBack={() => setShowQuickMemorizeModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};