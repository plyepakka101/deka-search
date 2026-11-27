import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, 
  X, Volume2, ListMusic, Brain, ChevronDown, ChevronUp,
  Folder, CheckCircle2, BookmarkCheck, Maximize2, Minimize2
} from 'lucide-react';
import { MemorizationItem, AppSettings } from '../types';
import { getSectionNumber } from './MemorizePlayer';
import { getLaws, getSettings } from '../services/dataService';
import {
  isAzureUnavailable,
  normalizeLawTextForTTS,
  pickBrowserVoice,
  playAudioUrl,
  resetAudio,
} from '@/lib/tts';

interface FolderAudioPlayerProps {
  items: MemorizationItem[];
  folderTitle: string;
  settings?: AppSettings;
  onClose: () => void;
  onOpenMemorize?: (items: MemorizationItem[]) => void;
}

type LoopMode = 'all' | 'one' | 'none';

export const FolderAudioPlayer: React.FC<FolderAudioPlayerProps> = ({
  items,
  folderTitle,
  settings,
  onClose,
  onOpenMemorize
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>('all');
  const [voiceRate, setVoiceRate] = useState<number>(settings?.speakingRate || 1.0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isPlayingRef = useRef(false);
  const loopTimerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);

  const effectiveSettings = settings || getSettings();
  const currentItem = items[currentIndex];
  const total = items.length;

  // Retrieve full text for the section
  const allLaws = getLaws();
  const matchedLaw = allLaws.find(l => 
    (currentItem?.sectionId && l.id === currentItem.sectionId) ||
    (currentItem?.sectionNumber && l.sectionNumber === currentItem.sectionNumber)
  );
  const sectionBody = (currentItem?.customText || currentItem?.content || matchedLaw?.content || '').trim();
  const secNumber = getSectionNumber(currentItem) || currentItem?.sectionNumber || '';

  // Load voices for fallback browser TTS
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
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

  const stopAudio = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    playTokenRef.current += 1;
    resetAudio(audioRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Construct speech text with Section Number + Content
  const getSpeechText = useCallback((item: MemorizationItem) => {
    const raw = (item.customText || item.content || matchedLaw?.content || '').replace(/\[\d+\]/g, '').trim();
    const num = getSectionNumber(item) || item.sectionNumber || '';
    const prefix = num ? `มาตรา ${num}` : (item.title || 'มาตรา');
    if (raw.startsWith('มาตรา')) return raw;
    return `${prefix}. ${raw}`;
  }, [matchedLaw]);

  // Audio Playback
  const playCurrentTrack = useCallback((indexToPlay: number) => {
    if (indexToPlay < 0 || indexToPlay >= items.length) return;
    stopAudio();

    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentIndex(indexToPlay);

    const targetItem = items[indexToPlay];
    const textToSpeak = getSpeechText(targetItem);

    const onTrackFinished = () => {
      if (!isPlayingRef.current) return;

      // Handle loop mode
      if (loopMode === 'one') {
        loopTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) playCurrentTrack(indexToPlay);
        }, 1200);
      } else if (indexToPlay + 1 < items.length) {
        loopTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) playCurrentTrack(indexToPlay + 1);
        }, 1200);
      } else if (loopMode === 'all') {
        // Loop back to start
        loopTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) playCurrentTrack(0);
        }, 1800);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    const provider = effectiveSettings.ttsProvider ?? 'azure';
    if (provider === 'browser' || (provider === 'azure' && isAzureUnavailable()) || typeof window === 'undefined') {
      window.speechSynthesis?.cancel();
      const clean = normalizeLawTextForTTS(textToSpeak);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = voiceRate;
      const available = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selVoice = pickBrowserVoice(available, effectiveSettings.voiceURI);
      if (selVoice) utterance.voice = selVoice;
      else utterance.lang = 'th-TH';

      utterance.onend = onTrackFinished;
      utterance.onerror = (e: any) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        setIsPlaying(false);
        isPlayingRef.current = false;
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Azure / Online TTS
    const token = ++playTokenRef.current;
    window.speechSynthesis?.cancel();

    const el = audioRef.current ?? new Audio();
    audioRef.current = el;
    resetAudio(el);

    import('@/lib/tts').then(tts => {
      tts.getAudioUrl(textToSpeak, effectiveSettings.voiceURI || 'th-TH-PremwadeeNeural', voiceRate, provider)
        .then(url => {
          if (token !== playTokenRef.current) return;
          return tts.playAudioUrl(
            el,
            url,
            {
              onEnded: onTrackFinished,
              onError: () => {
                if (token !== playTokenRef.current) return;
                // Fallback to browser
                const clean = normalizeLawTextForTTS(textToSpeak);
                const utter = new SpeechSynthesisUtterance(clean);
                utter.rate = voiceRate;
                utter.lang = 'th-TH';
                utter.onend = onTrackFinished;
                window.speechSynthesis.speak(utter);
              }
            },
            voiceRate
          );
        })
        .catch(() => {
          if (token !== playTokenRef.current) return;
          const clean = normalizeLawTextForTTS(textToSpeak);
          const utter = new SpeechSynthesisUtterance(clean);
          utter.rate = voiceRate;
          utter.lang = 'th-TH';
          utter.onend = onTrackFinished;
          window.speechSynthesis.speak(utter);
        });
    });
  }, [items, loopMode, voiceRate, effectiveSettings, voices, getSpeechText, stopAudio]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playCurrentTrack(currentIndex);
    }
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % items.length;
    playCurrentTrack(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    playCurrentTrack(prevIdx);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Auto-start playback on initial open
  useEffect(() => {
    playCurrentTrack(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentItem) return null;

  // Minimized floating pill player
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-2xl border border-law-200 dark:border-law-800 animate-in fade-in slide-in-from-bottom-5">
        <div className="w-10 h-10 rounded-xl bg-law-600 text-white flex items-center justify-center shrink-0">
          <Volume2 size={20} className={isPlaying ? "animate-pulse" : ""} />
        </div>
        <div className="min-w-0 pr-2">
          <div className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
            ม. {secNumber} ({currentIndex + 1}/{total})
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
            {folderTitle}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlayPause}
            className="p-2 rounded-xl bg-law-50 dark:bg-law-950 text-law-600 hover:bg-law-100 transition"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            title="ขยายเครื่องเล่น"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={() => { stopAudio(); onClose(); }}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 transition"
            title="ปิดเครื่องเล่น"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 font-sans">
        
        {/* Player Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-750">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-law-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Folder size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400 font-medium truncate">
                เพลย์ลิสต์เสียงต่อเนื่อง (Continuous Audio Loop)
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {folderTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenMemorize && (
              <button
                onClick={() => { stopAudio(); onOpenMemorize(items); }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                title="สลับไปยังโหมดท่องจำแบบการ์ดประเมิน"
              >
                <Brain size={14} />
                <span>โหมดท่องจำ</span>
              </button>
            )}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              title="ย่อเป็นหน้าต่างลอย"
            >
              <Minimize2 size={17} />
            </button>
            <button
              onClick={() => { stopAudio(); onClose(); }}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
              title="ปิด"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Currently Playing Card */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
              <span>{isPlaying ? 'กำลังเล่นเสียง...' : 'หยุดชั่วคราว'}</span>
            </span>
            <span>มาตราที่ {currentIndex + 1} จากทั้งหมด {total} มาตรา</span>
          </div>

          {/* Section Banner */}
          <div className="bg-law-50/70 dark:bg-law-950/30 p-4 rounded-2xl border border-law-100 dark:border-law-900/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl sm:text-2xl font-black text-law-700 dark:text-law-300">
                มาตรา {secNumber}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                {currentItem.title || `มาตรา ${secNumber}`}
              </div>
            </div>

            {/* Mastery Tag */}
            {currentItem.status === 'mastered' || (typeof currentItem.lastQuality === 'number' && currentItem.lastQuality >= 3) ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                🟢 จำได้แล้ว
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                🔴 ยังจำไม่ได้
              </span>
            )}
          </div>

          {/* Section Body Text */}
          <div className="p-5 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-150 dark:border-gray-700 text-base leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-line font-sarabun max-h-56 sm:max-h-72 overflow-y-auto">
            {sectionBody || 'ไม่มีเนื้อหาตัวบท'}
          </div>
        </div>

        {/* Collapsible Playlist Drawer */}
        {showPlaylist && (
          <div className="px-5 pb-3 max-h-48 overflow-y-auto border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 bg-gray-50/50 dark:bg-gray-850">
            <div className="text-xs font-bold text-gray-400 py-2 sticky top-0 bg-gray-50 dark:bg-gray-850 z-10 flex items-center justify-between">
              <span>รายชื่อมาตราในโฟลเดอร์นี้ ({total}):</span>
              <span className="text-[11px] font-normal">คลิกเพื่อข้ามไปยังมาตรานั้น</span>
            </div>
            {items.map((item, idx) => {
              const num = getSectionNumber(item) || item.sectionNumber;
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => playCurrentTrack(idx)}
                  className={`w-full py-2 px-3 text-left flex items-center justify-between gap-3 text-xs rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-law-600 text-white font-bold shadow-xs'
                      : 'hover:bg-white dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="shrink-0">{idx + 1}.</span>
                    <span className="font-bold shrink-0">ม. {num}</span>
                    <span className="truncate opacity-90">{item.title || item.content?.slice(0, 40)}</span>
                  </div>
                  {isSelected && <Volume2 size={14} className="shrink-0 animate-pulse" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Player Controls Bar */}
        <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 border-t border-gray-150 dark:border-gray-700 space-y-3">
          {/* Main playback buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Loop Mode Toggle */}
            <button
              onClick={() => {
                setLoopMode(prev => prev === 'all' ? 'one' : prev === 'one' ? 'none' : 'all');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                loopMode === 'all'
                  ? 'bg-law-50 text-law-700 border-law-300 dark:bg-law-950 dark:text-law-300'
                  : loopMode === 'one'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                  : 'text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
              title={
                loopMode === 'all'
                  ? 'วนซ้ำทั้งโฟลเดอร์ (Loop All)'
                  : loopMode === 'one'
                  ? 'วนซ้ำเฉพาะมาตรานี้ (Repeat One)'
                  : 'เล่นรอบเดียวจบ (No Loop)'
              }
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">
                {loopMode === 'all' ? 'วนทั้งโฟลเดอร์' : loopMode === 'one' ? 'วนมาตรานี้' : 'เล่นรอบเดียว'}
              </span>
            </button>

            {/* Prev Track */}
            <button
              onClick={handlePrev}
              className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition active:scale-95 cursor-pointer shadow-2xs"
              title="มาตราก่อนหน้า"
            >
              <SkipBack size={18} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="p-4 rounded-2xl bg-law-600 hover:bg-law-700 active:scale-95 text-white transition shadow-md cursor-pointer"
              title={isPlaying ? 'หยุดชั่วคราว' : 'เล่นเสียง'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="translate-x-0.5" />}
            </button>

            {/* Next Track */}
            <button
              onClick={handleNext}
              className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition active:scale-95 cursor-pointer shadow-2xs"
              title="มาตราถัดไป"
            >
              <SkipForward size={18} />
            </button>

            {/* Playlist Drawer Toggle */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                showPlaylist
                  ? 'bg-law-600 text-white border-law-600'
                  : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="ดูรายชื่อมาตราในโฟลเดอร์"
            >
              <ListMusic size={16} />
              <span className="hidden sm:inline">รายชื่อ ({total})</span>
            </button>
          </div>

          {/* Sub-controls: voice speed & progress */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-1.5">
              <span>ความเร็วเสียง:</span>
              <select
                value={voiceRate}
                onChange={e => {
                  const r = parseFloat(e.target.value);
                  setVoiceRate(r);
                  if (isPlaying) playCurrentTrack(currentIndex);
                }}
                className="py-1 px-2 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs text-gray-700 dark:text-gray-200"
              >
                <option value="0.8">0.8x (ช้า)</option>
                <option value="1.0">1.0x (ปกติ)</option>
                <option value="1.2">1.2x (เร็ว)</option>
                <option value="1.5">1.5x (เร็วมาก)</option>
              </select>
            </div>

            <div className="text-[11px] text-gray-400">
              กดปุ่ม <span className="font-bold text-gray-600 dark:text-gray-300">วนทั้งโฟลเดอร์</span> เพื่อฟังอ่านทบทวนยาวๆ แบบใส่หูฟัง
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
