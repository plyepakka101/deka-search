import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Volume2, Eye, EyeOff, CheckCircle2, 
  RotateCcw, Sparkles, Flame, Award, ChevronRight, ChevronLeft,
  Play, Square
} from 'lucide-react';
import { MemorizationItem, MemorizeStudyMode, ParagraphSlice, AppSettings } from '../types';
import { sliceParagraphs } from '../services/paragraphSlicer';
import { generateClozeBlanks } from '../services/keywordExtractor';
import { recordReview } from '../services/memorizeService';
import { ReviewRating } from '../services/srsEngine';
import { getSettings } from '../services/dataService';
import { thaiToArabic } from '../utils/textUtils';

export const getSectionNumber = (item?: MemorizationItem): string => {
  if (!item) return '';
  if (item.sectionNumber && String(item.sectionNumber).trim()) {
    return thaiToArabic(String(item.sectionNumber).trim());
  }
  if (item.title) {
    const match = item.title.match(/(?:มาตรา|ม\.)\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
    if (match) return thaiToArabic(match[1].trim());
  }
  if (item.sectionId) {
    const parts = item.sectionId.split('-');
    if (parts.length > 1) {
      return thaiToArabic(parts.slice(1).join('/'));
    }
  }
  return '';
};

interface Props {
  items: MemorizationItem[];
  deckTitle?: string;
  settings?: AppSettings;
  onFinish: () => void;
  onBack: () => void;
}

export const MemorizePlayer: React.FC<Props> = ({ items, deckTitle, settings, onFinish, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<MemorizeStudyMode>('recall');
  const [selectedParagraphIdx, setSelectedParagraphIdx] = useState(0); // 0 = all
  const [revealed, setRevealed] = useState(false);
  
  // Effective settings fallback
  const effectiveSettings = settings || getSettings();

  // Audio state
  const [speaking, setSpeaking] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [voiceRate, setVoiceRate] = useState<number>(effectiveSettings.speakingRate || 1.0);
  const [reciteCountdown, setReciteCountdown] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Loop & Timer refs
  const isLoopingRef = useRef(false);
  const loopTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Update voiceRate if effectiveSettings changes
  useEffect(() => {
    if (effectiveSettings.speakingRate) {
      setVoiceRate(effectiveSettings.speakingRate);
    }
  }, [effectiveSettings.speakingRate]);

  // Load and cache SpeechSynthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Cloze state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  const currentItem = items[currentIndex];
  const total = items.length;

  // Split paragraphs
  const rawText = currentItem?.customText || currentItem?.content || '';
  const paragraphs = sliceParagraphs(rawText);

  // Active text based on paragraph selection
  const activeText = selectedParagraphIdx === 0 
    ? rawText 
    : (paragraphs[selectedParagraphIdx - 1]?.content || rawText);

  // Cloze content
  const clozeData = generateClozeBlanks(activeText, 4);

  const stopTTS = useCallback(() => {
    isLoopingRef.current = false;
    setIsLooping(false);

    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setReciteCountdown(null);
  }, []);

  useEffect(() => {
    // Reset state on card change
    setRevealed(false);
    setUserAnswers({});
    setSelectedParagraphIdx(0);
    stopTTS();
  }, [currentIndex, stopTTS]);

  useEffect(() => {
    // Reset reveal and answers when user switches paragraph
    setRevealed(false);
    setUserAnswers({});
    stopTTS();
  }, [selectedParagraphIdx, stopTTS]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, [stopTTS]);

  if (!currentItem) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award size={36} />
        </div>
        <h3 className="text-xl font-bold mb-2">ทบทวนครบตามเป้าหมายแล้ว! 🎉</h3>
        <p className="text-gray-500 text-sm mb-6">คุณได้ทบทวนมาตราในชุดนี้ครบถ้วนแล้ว ระบบได้คำนวณรอบทบทวนถัดไปให้เรียบร้อย</p>
        <button
          onClick={onFinish}
          className="w-full py-3 bg-law-600 hover:bg-law-700 text-white font-semibold rounded-xl transition"
        >
          กลับสู่ศูนย์การท่องจำ
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Single Audio playback handler
  // -------------------------------------------------------------------
  const playSingleTTS = (textToSpeak: string, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับ Speech Synthesis');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = voiceRate;

    const currentSettings = settings || getSettings();
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    // 1. If user selected a specific voice in Settings, try to match it by voiceURI
    if (currentSettings.voiceURI) {
      selectedVoice = availableVoices.find(v => v.voiceURI === currentSettings.voiceURI) || null;
    }

    // 2. If no voice selected or specified voice not found, find a Thai voice
    if (!selectedVoice) {
      selectedVoice = availableVoices.find(v => v.lang === 'th-TH') || availableVoices.find(v => v.lang.includes('th')) || null;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      utterance.lang = 'th-TH';
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = (e: any) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('Speech error:', e);
      setSpeaking(false);
      isLoopingRef.current = false;
      setIsLooping(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // -------------------------------------------------------------------
  // Auto-announce section number on card change (เมื่อเลื่อนข้อให้อ่านเลขมาตราอัตโนมัติ)
  // -------------------------------------------------------------------
  const [autoAnnounceSection, setAutoAnnounceSection] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('memo_auto_announce_section');
      if (saved === 'true') {
        setAutoAnnounceSection(true);
      }
    }
  }, []);

  const toggleAutoAnnounce = () => {
    const nextVal = !autoAnnounceSection;
    setAutoAnnounceSection(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('memo_auto_announce_section', String(nextVal));
    }
    if (nextVal && currentItem) {
      const secNum = getSectionNumber(currentItem);
      playSingleTTS(`เปิดอ่านเลขมาตราอัตโนมัติ มาตรา ${secNum}`);
    }
  };

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (autoAnnounceSection && currentItem) {
      const secNum = getSectionNumber(currentItem);
      const pLabel = selectedParagraphIdx > 0 ? (paragraphs[selectedParagraphIdx - 1]?.label || '') : '';
      const text = pLabel ? (secNum ? `มาตรา ${secNum} ${pLabel}` : pLabel) : (secNum ? `มาตรา ${secNum}` : currentItem.title || 'มาตรา');
      const timer = setTimeout(() => {
        playSingleTTS(text);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, autoAnnounceSection]);

  // -------------------------------------------------------------------
  // Helpers to construct speech text that always includes Section Number
  // -------------------------------------------------------------------
  const getFullSpeechText = (item: MemorizationItem, text: string, paragraphIdx: number): string => {
    const cleanBody = text.replace(/\[\d+\]/g, '').trim();
    const secNum = getSectionNumber(item);
    const secLabel = secNum ? `มาตรา ${secNum}` : '';

    if (paragraphIdx === 0) {
      if (!secLabel) return cleanBody;
      if (cleanBody.startsWith(secLabel)) {
        return cleanBody;
      }
      if (cleanBody.startsWith('มาตรา')) {
        return cleanBody;
      }
      return `${secLabel}. ${cleanBody}`;
    } else {
      const pLabel = paragraphs[paragraphIdx - 1]?.label || `วรรค ${paragraphIdx}`;
      const fullPrefix = secLabel ? `${secLabel} ${pLabel}` : pLabel;
      if (cleanBody.startsWith(fullPrefix)) {
        return cleanBody;
      }
      if (cleanBody.startsWith(pLabel)) {
        return secLabel ? `${secLabel} ${cleanBody}` : cleanBody;
      }
      return `${fullPrefix}. ${cleanBody}`;
    }
  };

  // Speak only the section number & paragraph title
  const handleSpeakSectionOnly = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopTTS();
    const secNum = getSectionNumber(currentItem);
    const pLabel = selectedParagraphIdx > 0 ? (paragraphs[selectedParagraphIdx - 1]?.label || '') : '';
    const text = pLabel ? (secNum ? `มาตรา ${secNum} ${pLabel}` : pLabel) : (secNum ? `มาตรา ${secNum}` : currentItem.title || 'มาตรา');
    playSingleTTS(text);
  };

  // Play full text with section number once
  const handlePlayOnce = () => {
    if (speaking || isLooping) {
      stopTTS();
      return;
    }
    stopTTS();
    const textToSpeak = getFullSpeechText(currentItem, activeText, selectedParagraphIdx);
    playSingleTTS(textToSpeak);
  };

  // -------------------------------------------------------------------
  // Continuous Audio Loop (ทั้งมาตรา หรือ ทีละวรรค วน loop จนกว่าจะกดหยุด)
  // -------------------------------------------------------------------
  const handleToggleAudioLoop = () => {
    if (isLooping || speaking) {
      stopTTS();
      return;
    }

    stopTTS();
    isLoopingRef.current = true;
    setIsLooping(true);

    const textToSpeak = getFullSpeechText(currentItem, activeText, selectedParagraphIdx);

    const runLoopIteration = () => {
      if (!isLoopingRef.current) return;
      playSingleTTS(textToSpeak, () => {
        if (!isLoopingRef.current) return;
        // Pause 1.2 seconds between loop repetitions
        loopTimerRef.current = setTimeout(() => {
          if (isLoopingRef.current) {
            runLoopIteration();
          }
        }, 1200);
      });
    };

    runLoopIteration();
  };

  // -------------------------------------------------------------------
  // Voice Recite Mode: Play Prompt -> Pause countdown -> Play Answer (Loop until stopped)
  // -------------------------------------------------------------------
  const handleStartVoiceRecite = () => {
    if (isLooping || speaking || reciteCountdown !== null) {
      stopTTS();
      return;
    }

    stopTTS();
    isLoopingRef.current = true;
    setIsLooping(true);
    setRevealed(false);

    const secNum = getSectionNumber(currentItem);
    const pLabel = selectedParagraphIdx > 0 ? (paragraphs[selectedParagraphIdx - 1]?.label || '') : '';
    const titlePrompt = pLabel 
      ? (secNum ? `มาตรา ${secNum} ${pLabel}` : pLabel) 
      : (secNum ? `มาตรา ${secNum}` : currentItem.title || 'มาตรา');

    const answerSpeech = getFullSpeechText(currentItem, activeText, selectedParagraphIdx);

    const runReciteLoop = () => {
      if (!isLoopingRef.current) return;

      setRevealed(false);
      playSingleTTS(titlePrompt, () => {
        if (!isLoopingRef.current) return;

        // Prompt ended -> start countdown for user to recite
        let count = 7;
        setReciteCountdown(count);

        countdownTimerRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            setReciteCountdown(null);

            if (!isLoopingRef.current) return;

            // Play Reveal Answer with section number
            setRevealed(true);
            playSingleTTS(`เฉลย ${answerSpeech}`, () => {
              if (!isLoopingRef.current) return;

              // Pause 2.5 seconds before next round
              loopTimerRef.current = setTimeout(() => {
                if (isLoopingRef.current) {
                  runReciteLoop();
                }
              }, 2500);
            });
          } else {
            setReciteCountdown(count);
          }
        }, 1000);
      });
    };

    runReciteLoop();
  };

  // -------------------------------------------------------------------
  // Submit rating and advance
  // -------------------------------------------------------------------
  const handleRating = async (rating: ReviewRating) => {
    stopTTS();
    await recordReview(currentItem.id, rating, mode);
    if (currentIndex + 1 < total) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  // Browse articles without submitting a review.
  const goToItem = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= total || nextIndex === currentIndex) return;
    stopTTS();
    setCurrentIndex(nextIndex);
  };

  // Cloze answer selector
  const handleSelectCloze = (blankId: number, selectedWord: string) => {
    setUserAnswers(prev => ({ ...prev, [blankId]: selectedWord }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 animate-in fade-in duration-200 font-sans">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => { stopTTS(); onBack(); }}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-law-600 transition"
        >
          <ArrowLeft size={18} />
          <span>ออกจากการท่อง</span>
        </button>
        <div className="text-center">
          <div className="text-xs text-gray-400 font-medium truncate max-w-[200px] sm:max-w-xs">
            {deckTitle || 'ชุดท่องจำกฎหมาย'}
          </div>
          <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
            รายการ {currentIndex + 1} / {total}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <Flame size={14} />
            <span>ต่อเนื่อง {currentItem.streak || 0}</span>
          </div>
          <button
            type="button"
            onClick={() => goToItem(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="ไปมาตราก่อนหน้า"
            title="มาตราก่อนหน้า"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => goToItem(currentIndex + 1)}
            disabled={currentIndex === total - 1}
            aria-label="ไปมาตราถัดไป"
            title="มาตราถัดไป"
            className="p-2 rounded-lg border border-law-200 dark:border-law-800 text-law-600 dark:text-law-300 hover:bg-law-50 dark:hover:bg-law-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-xs">
        <button type="button" onClick={() => goToItem(currentIndex - 1)} disabled={currentIndex === 0} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronLeft size={15} /> มาตราก่อนหน้า
        </button>
        <span className="text-gray-400 truncate">มาตรา {currentItem.sectionNumber}</span>
        <button type="button" onClick={() => goToItem(currentIndex + 1)} disabled={currentIndex === total - 1} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-law-600 dark:text-law-300 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
          มาตราถัดไป <ChevronRight size={15} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-law-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-xs font-medium">
        <button
          onClick={() => { setMode('recall'); stopTTS(); }}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition ${mode === 'recall' ? 'bg-white dark:bg-gray-700 shadow-sm text-law-600 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
        >
          <Eye size={15} />
          <span>1. ฟังแล้วนึก</span>
        </button>

        <button
          onClick={() => { setMode('cloze'); stopTTS(); }}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition ${mode === 'cloze' ? 'bg-white dark:bg-gray-700 shadow-sm text-law-600 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
        >
          <Sparkles size={15} />
          <span>2. เติมคำสำคัญ</span>
        </button>

        <button
          onClick={() => { setMode('voice'); stopTTS(); }}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition ${mode === 'voice' ? 'bg-white dark:bg-gray-700 shadow-sm text-law-600 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
        >
          <Volume2 size={15} />
          <span>3. ท่องด้วยเสียง</span>
        </button>

        <button
          onClick={() => { setMode('read'); stopTTS(); }}
          className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition ${mode === 'read' ? 'bg-white dark:bg-gray-700 shadow-sm text-law-600 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
        >
          <CheckCircle2 size={15} />
          <span>4. อ่านตัวบทเต็ม</span>
        </button>
      </div>

      {/* Paragraph Selector Tabs (ท่องทีละวรรค) */}
      {paragraphs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 text-xs shrink-0 pl-1">เลือกท่อง:</span>
          <button
            onClick={() => { setSelectedParagraphIdx(0); stopTTS(); }}
            className={`px-3 py-1 rounded-full border transition whitespace-nowrap ${selectedParagraphIdx === 0 ? 'bg-law-600 text-white border-law-600 font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
          >
            ทั้งมาตรา
          </button>
          {paragraphs.map(p => (
            <button
              key={p.index}
              onClick={() => { setSelectedParagraphIdx(p.index); stopTTS(); }}
              className={`px-3 py-1 rounded-full border transition whitespace-nowrap ${selectedParagraphIdx === p.index ? 'bg-law-600 text-white border-law-600 font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Flashcard Body */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-law-100 dark:bg-law-900/50 text-law-700 dark:text-law-300">
                มาตรา {getSectionNumber(currentItem) || currentItem.sectionNumber}
              </span>
              <button
                type="button"
                onClick={handleSpeakSectionOnly}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                title="กดเพื่อฟังเสียงอ่านเลขมาตรานี้"
              >
                <Volume2 size={13} className="text-amber-600 dark:text-amber-400" />
                <span>อ่านเลขมาตรา</span>
              </button>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {currentItem.title || `มาตรา ${getSectionNumber(currentItem) || currentItem.sectionNumber}`}
            </h2>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={voiceRate}
              onChange={e => setVoiceRate(parseFloat(e.target.value))}
              className="text-xs border rounded-lg p-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              title="ความเร็วเสียงอ่าน"
            >
              <option value="0.8">0.8x</option>
              <option value="1.0">1.0x</option>
              <option value="1.2">1.2x</option>
              <option value="1.5">1.5x</option>
            </select>

            {/* Toggle Auto Announce Section */}
            <button
              type="button"
              onClick={toggleAutoAnnounce}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                autoAnnounceSection
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
              }`}
              title="เปิด/ปิดการอ่านเลขมาตราโดยอัตโนมัติเมื่อกดเลื่อนข้อถัดไปหรือก่อนหน้า"
            >
              <Volume2 size={13} />
              <span>อ่านเลขอัตโนมัติ: {autoAnnounceSection ? 'เปิด' : 'ปิด'}</span>
            </button>

            {/* Single Play / Loop Toggle */}
            {isLooping || speaking ? (
              <button
                onClick={stopTTS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs transition shadow-sm animate-pulse cursor-pointer"
                title="กดเพื่อหยุดเสียง"
              >
                <Square size={13} fill="currentColor" />
                <span>หยุดเสียง</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePlayOnce}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium text-xs transition border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  title="ฟังเสียงอ่านเลขมาตราพร้อมเนื้อหา 1 รอบ"
                >
                  <Play size={13} />
                  <span>ฟังเสียง</span>
                </button>
                <button
                  onClick={handleToggleAudioLoop}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-law-50 dark:bg-law-900/40 text-law-600 dark:text-law-300 hover:bg-law-100 dark:hover:bg-law-900/60 font-medium text-xs transition border border-law-200 dark:border-law-800 cursor-pointer"
                  title="ฟังเสียงอ่านเลขมาตราพร้อมเนื้อหาวนซ้ำ (loop)"
                >
                  <RotateCcw size={13} />
                  <span>วน loop</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card Content Area */}
        <div className="p-6 min-h-[220px] flex flex-col justify-center">
          {/* Mode 1: Active Recall (ฟังแล้วนึก / ซ่อนคำ) */}
          {mode === 'recall' && (
            <div className="space-y-4">
              {!revealed ? (
                <div className="space-y-4 text-center py-6">
                  <p className="text-sm text-gray-500">
                    ลองท่องตัวบทมาตรานี้ในใจ หรือพูดออกมาดังๆ จากนั้นกดปุ่มเฉลยเพื่อตรวจคำตอบ
                  </p>
                  <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl text-gray-400 font-mono text-sm leading-relaxed border border-dashed border-gray-300 dark:border-gray-600 select-none">
                    {activeText.slice(0, 18)}... [ซ่อนเนื้อหาตัวบทเพื่อการท่องจำ] ...
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSpeakSectionOnly}
                      className="inline-flex items-center gap-1.5 py-3 px-5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold rounded-xl text-sm transition cursor-pointer shadow-xs"
                      title="กดเพื่อฟังเสียงอ่านเลขมาตรา"
                    >
                      <Volume2 size={16} className="text-amber-600 dark:text-amber-400" />
                      <span>🔊 ฟังโจทย์ (มาตรา {getSectionNumber(currentItem) || currentItem.sectionNumber})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="inline-flex items-center gap-2 py-3 px-6 bg-law-600 hover:bg-law-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer"
                    >
                      <Eye size={18} />
                      <span>👁️ เฉลยตัวบทกฎหมาย</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-base text-gray-900 dark:text-gray-100 leading-relaxed font-sans whitespace-pre-line p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                    {activeText}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={handlePlayOnce}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                      title="ฟังเสียงอ่านเฉลยพร้อมเลขมาตรา"
                    >
                      <Volume2 size={14} />
                      <span>ฟังเสียงเฉลย (มาตรา {getSectionNumber(currentItem) || currentItem.sectionNumber})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevealed(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
                    >
                      <EyeOff size={14} />
                      <span>ซ่อนเฉลย</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Cloze Deletion (เติมคำสำคัญ) */}
          {mode === 'cloze' && (
            <div className="space-y-5">
              <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line font-sans p-4 bg-gray-50 dark:bg-gray-750 rounded-xl">
                {clozeData.blanks.length === 0 ? (
                  activeText
                ) : (
                  clozeData.maskedText.split(/(\[ช่องที่ \d+\])/g).map((segment, idx) => {
                    const match = segment.match(/\[ช่องที่ (\d+)\]/);
                    if (match) {
                      const blankId = parseInt(match[1]);
                      const chosen = userAnswers[blankId];
                      const blankInfo = clozeData.blanks.find(b => b.id === blankId);
                      const isCorrect = chosen === blankInfo?.word;

                      return (
                        <span
                          key={idx}
                          className={`inline-block mx-1 px-2.5 py-0.5 rounded font-bold transition text-sm ${
                            !chosen
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300'
                              : isCorrect
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-400'
                          }`}
                        >
                          {chosen || `ช่องที่ ${blankId}`}
                        </span>
                      );
                    }
                    return <span key={idx}>{segment}</span>;
                  })
                )}
              </div>

              {/* Options selector */}
              {clozeData.blanks.length > 0 && (
                <div className="space-y-3 pt-2 border-t dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-500">เลือกคำตอบลงในช่องว่าง:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clozeData.blanks.map(blank => (
                      <div key={blank.id} className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                        <div className="text-xs font-bold text-law-600">ช่องที่ {blank.id}:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {blank.options.map(opt => {
                            const isSelected = userAnswers[blank.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleSelectCloze(blank.id, opt)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                                  isSelected
                                    ? 'bg-law-600 text-white border-law-600 font-bold'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Voice Recite (ฟัง -> พักให้ท่อง -> เฉลย) */}
          {mode === 'voice' && (
            <div className="space-y-6 text-center py-6">
              <div className="max-w-md mx-auto space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  แอปจะอ่านชื่อมาตรานำ แล้วเว้นช่วงให้ท่านท่องออกเสียง จากนั้นจะเล่นเสียงเฉลยให้อัตโนมัติ (วน loop ซ้ำจนกว่าจะกดหยุด)
                </p>

                {reciteCountdown !== null && (
                  <div className="py-6 space-y-3 animate-pulse">
                    <div className="text-4xl font-extrabold text-law-600">
                      {reciteCountdown}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      🎙️ กำลังให้เวลาท่านท่องออกเสียง...
                    </div>
                    <div>
                      <button
                        onClick={stopTTS}
                        className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5"
                      >
                        <Square size={13} fill="currentColor" />
                        <span>หยุดท่อง</span>
                      </button>
                    </div>
                  </div>
                )}

                {reciteCountdown === null && (
                  <>
                    {isLooping ? (
                      <button
                        onClick={stopTTS}
                        className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 mx-auto animate-pulse"
                      >
                        <Square size={18} fill="currentColor" />
                        <span>หยุดการท่องวน loop</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStartVoiceRecite}
                        className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 mx-auto"
                      >
                        <Play size={18} />
                        <span>เริ่มฟังเสียงและฝึกท่อง (วน loop)</span>
                      </button>
                    )}
                  </>
                )}

                {revealed && (
                  <div className="text-left p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-emerald-600 flex items-center justify-between">
                      <span>เฉลยตัวบท:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        มาตรา {getSectionNumber(currentItem) || currentItem.sectionNumber}
                        {selectedParagraphIdx > 0 && ` (${paragraphs[selectedParagraphIdx - 1]?.label || `วรรค ${selectedParagraphIdx}`})`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
                      {activeText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 4: Read Full Law (อ่านตัวบทเต็ม) */}
          {mode === 'read' && (
            <div className="space-y-4">
              <div className="text-base text-gray-900 dark:text-gray-100 leading-relaxed font-sans whitespace-pre-line p-4 bg-gray-50 dark:bg-gray-750 rounded-xl">
                {!activeText.startsWith('มาตรา') && (
                  <div className="font-bold text-law-700 dark:text-law-300 mb-2">
                    มาตรา {getSectionNumber(currentItem) || currentItem.sectionNumber}
                    {selectedParagraphIdx > 0 && ` (${paragraphs[selectedParagraphIdx - 1]?.label || `วรรค ${selectedParagraphIdx}`})`}
                  </div>
                )}
                {activeText}
              </div>
            </div>
          )}
        </div>

        {/* Self-Assessment Buttons (SM-2 Spaced Repetition) */}
        <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 mb-2.5 text-center">
            ประเมินผลการจำของคุณ (เพื่อคำนวณรอบทบทวนถัดไป):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleRating(1)}
              className="py-2.5 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs flex flex-col items-center justify-center gap-0.5 transition shadow-sm"
            >
              <span>🔴 จำไม่ได้เลย</span>
              <span className="text-[10px] opacity-80">(ทบทวนซ้ำวันนี้)</span>
            </button>

            <button
              onClick={() => handleRating(2)}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex flex-col items-center justify-center gap-0.5 transition shadow-sm"
            >
              <span>🟠 ยาก / ติดขัด</span>
              <span className="text-[10px] opacity-80">(ทบทวนพรุ่งนี้)</span>
            </button>

            <button
              onClick={() => handleRating(3)}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex flex-col items-center justify-center gap-0.5 transition shadow-sm"
            >
              <span>🟢 จำได้ดี</span>
              <span className="text-[10px] opacity-80">(อีก 3-4 วัน)</span>
            </button>

            <button
              onClick={() => handleRating(4)}
              className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex flex-col items-center justify-center gap-0.5 transition shadow-sm"
            >
              <span>🌟 จำแม่นยำ</span>
              <span className="text-[10px] opacity-80">(อีก 7 วันขึ้นไป)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
