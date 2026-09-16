import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, Settings as SettingsIcon, Monitor, Cloud, HardDrive, 
  Info, Volume2, CheckSquare, Square, FileText, Brain, Bookmark, 
  BookOpen, AlertTriangle, X, Check, RefreshCw, FileCheck
} from 'lucide-react';
import { 
  exportData, 
  importData, 
  inspectBackupData, 
  resetData, 
  DEFAULT_EXPORT_OPTIONS, 
  ImportSummary 
} from '../services/dataService';
import { AppSettings, ExportOptions } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Export options state
  const [exportOpts, setExportOpts] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  // Current storage counts
  const [counts, setCounts] = useState({
    notes: 0,
    starred: 0,
    linkedDekas: 0,
    memoDecks: 0,
    memoCards: 0,
    bookmarks: 0,
    customLaws: 0,
  });

  // Pre-restore inspection modal state
  const [pendingRestore, setPendingRestore] = useState<{
    content: string;
    summary: ImportSummary;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const refreshCounts = () => {
    if (typeof window === 'undefined') return;
    try {
      const rawNotes = localStorage.getItem('thai_law_mate_notes');
      let notes = 0, starred = 0, linkedDekas = 0;
      if (rawNotes) {
        const parsed = JSON.parse(rawNotes);
        notes = Object.keys(parsed).length;
        Object.values(parsed).forEach((n: any) => {
          if (n.isHighlighted) starred++;
          if (n.linkedDekaIds && Array.isArray(n.linkedDekaIds)) linkedDekas += n.linkedDekaIds.length;
        });
      }

      const rawDecks = localStorage.getItem('thai_law_mate_memo_decks');
      const memoDecks = rawDecks ? JSON.parse(rawDecks).length : 0;

      const rawItems = localStorage.getItem('thai_law_mate_memo_items');
      const memoCards = rawItems ? JSON.parse(rawItems).length : 0;

      const rawBookmarks = localStorage.getItem('deka_bookmarks');
      const bookmarks = rawBookmarks ? JSON.parse(rawBookmarks).length : 0;

      const rawCustomLaws = localStorage.getItem('thai_law_mate_custom_laws');
      const customLaws = rawCustomLaws ? JSON.parse(rawCustomLaws).length : 0;

      setCounts({ notes, starred, linkedDekas, memoDecks, memoCards, bookmarks, customLaws });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshCounts();

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const toggleExportOpt = (key: keyof ExportOptions) => {
    setExportOpts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllExportOpts = (value: boolean) => {
    setExportOpts({
      includeNotes: value,
      includeCustomLaws: value,
      includeMemorization: value,
      includeBookmarks: value,
      includeSettings: value,
    });
  };

  const hasAnyExportSelected = Object.values(exportOpts).some(Boolean);

  const handleExport = () => {
    if (!hasAnyExportSelected) {
      alert('กรุณาเลือกข้อมูลอย่างน้อย 1 รายการเพื่อสำรอง');
      return;
    }
    const data = exportData(exportOpts);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thai-law-mate-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const inspection = inspectBackupData(content);
      if (!inspection.valid || !inspection.summary) {
        setImportError(inspection.error || 'ไฟล์ไม่ถูกต้อง หรือรูปแบบข้อมูลผิดพลาด');
        return;
      }
      setPendingRestore({
        content,
        summary: inspection.summary,
      });
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    const ok = importData(pendingRestore.content);
    if (ok) {
      alert('กู้คืนข้อมูลสำเร็จ ระบบจะรีโหลดหน้าเว็บเพื่ออัปเดตข้อมูล');
      window.location.reload();
    } else {
      alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
    }
  };

  const handleReset = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?\n(รวมถึงโน้ต, การ์ดท่องสอบ, บุ๊กมาร์ก และกฎหมายที่แก้ไข)\n\nการกระทำนี้ไม่สามารถกู้คืนได้ (ยกเว้นคุณมีไฟล์ Backup)')) {
      resetData();
      alert('ล้างข้อมูลสำเร็จ ระบบจะรีโหลดหน้าเว็บ');
      window.location.reload();
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  // Filter only Thai voices
  const thaiVoices = voices.filter(v => v.lang.includes('th'));

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center space-x-3 mb-4 px-2">
        <div className="bg-gradient-to-br from-law-500 to-law-700 text-white p-2.5 rounded-xl shadow-lg">
          <SettingsIcon size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-law-900 dark:text-law-100">การตั้งค่า</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">ปรับแต่งการใช้งานและจัดการข้อมูล</p>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Monitor className="mr-2 text-law-600 dark:text-law-400" size={20} />
              การแสดงผล
           </h3>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Dark Mode */}
           <div className="flex items-center justify-between">
              <div>
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">โหมดกลางคืน</div>
                 <div className="text-sm text-gray-500 dark:text-gray-400">พื้นหลังสีเข้ม ถนอมสายตา</div>
              </div>
              <button
                 onClick={() => updateSetting('darkMode', !settings.darkMode)}
                 className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-law-500 focus:ring-offset-2 ${settings.darkMode ? 'bg-law-600' : 'bg-gray-200'}`}
              >
                 <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Font Style */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">รูปแบบตัวอักษร</div>
              <div className="grid grid-cols-2 gap-4">
                 <button
                    onClick={() => updateSetting('fontStyle', 'modern')}
                    className={`p-4 rounded-xl border text-center transition-all font-sans relative ${settings.fontStyle === 'modern' ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                 >
                    <div className="text-2xl mb-2">กขค</div>
                    <div className="text-sm font-medium">Sarabun</div>
                    <div className="text-xs opacity-70">อ่านง่าย ทันสมัย</div>
                 </button>
                 <button
                    onClick={() => updateSetting('fontStyle', 'traditional')}
                    className={`p-4 rounded-xl border text-center transition-all font-serif relative ${settings.fontStyle === 'traditional' ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                 >
                    <div className="text-2xl mb-2">กขค</div>
                    <div className="text-sm font-medium">TH Sarabun New</div>
                    <div className="text-xs opacity-70">แบบราชการ</div>
                 </button>
              </div>
           </div>
           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Font Size */}
           <div>
              <div className="flex justify-between items-center mb-2">
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">ขนาดตัวอักษร</div>
                 <div className="text-sm font-medium text-law-600 dark:text-law-400">{settings.fontSize || 16}px</div>
              </div>
              <input
                 type="range"
                 min="12"
                 max="32"
                 step="1"
                 value={settings.fontSize || 16}
                 onChange={(e) => {
                    const size = parseInt(e.target.value);
                    updateSetting('fontSize', size);
                    localStorage.setItem('preferred-font-size', size.toString());
                    document.documentElement.style.setProperty('--content-font-size', `${size}px`);
                 }}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-law-500"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                 <span>เล็ก (12px)</span>
                 <span>มาตรฐาน (16px)</span>
                 <span>ใหญ่ (32px)</span>
              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Line Height */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">ระยะห่างระหว่างบรรทัด</div>
              <div className="grid grid-cols-3 gap-3">
                 {[
                    { val: 1.5, label: 'แคบ' },
                    { val: 1.8, label: 'ปกติ' },
                    { val: 2.0, label: 'กว้าง' }
                 ].map((lh) => (
                    <button
                       key={lh.val}
                       onClick={() => updateSetting('lineHeight', lh.val)}
                       className={`py-2 rounded-lg border text-center transition-all ${settings.lineHeight === lh.val || (!settings.lineHeight && lh.val === 1.8) ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                       <div className="text-sm font-medium">{lh.label}</div>
                    </button>
                 ))}
              </div>
           </div>



        </div>
      </div>

      {/* Text-to-Speech Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Volume2 className="mr-2 text-law-600 dark:text-law-400" size={20} />
              การอ่านออกเสียง (Text-to-Speech)
           </h3>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Voice Selection */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">เสียงอ่าน (ภาษาไทย)</div>
              <select
                 value={settings.voiceURI || ''}
                 onChange={(e) => updateSetting('voiceURI', e.target.value)}
                 className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
              >
                 <option value="">อัตโนมัติ (แนะนำ)</option>
                 {thaiVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                       {voice.name}
                    </option>
                 ))}
              </select>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                 แสดงเฉพาะเสียงที่รองรับภาษาไทยในอุปกรณ์ของคุณ
              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Speaking Rate */}
           <div>
              <div className="flex justify-between mb-4">
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">ความเร็วการอ่าน</div>
                 <div className="text-sm font-bold text-law-600 dark:text-law-400 bg-law-50 dark:bg-law-900/50 px-2 py-0.5 rounded">
                    {settings.speakingRate || 1.0}x
                 </div>
              </div>
              <input 
                 type="range" 
                 min="0.5" 
                 max="2.0" 
                 step="0.1" 
                 value={settings.speakingRate || 1.0}
                 onChange={(e) => updateSetting('speakingRate', parseFloat(e.target.value))}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-law-600"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-400 font-sans px-1">
                 <span>ช้า (0.5x)</span>
                 <span>ปกติ (1.0x)</span>
                 <span>เร็ว (2.0x)</span>
              </div>
           </div>



        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <HardDrive className="mr-2 text-law-600 dark:text-law-400" size={20} />
            จัดการข้อมูล (Backup & Restore)
          </h3>
          <button 
            onClick={refreshCounts}
            className="text-xs text-gray-500 hover:text-law-600 dark:text-gray-400 dark:hover:text-law-300 flex items-center gap-1 transition-colors"
            title="รีเฟรชยอดข้อมูลปัจจุบัน"
          >
            <RefreshCw size={12} />
            <span>อัปเดตยอด</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-start space-x-3">
            <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">การเก็บสำรองข้อมูล (Cloud & Local)</p>
              <p className="opacity-90 leading-relaxed text-xs sm:text-sm">
                เลือกหมวดหมู่ที่ต้องการ แล้วกด <strong>"ดาวน์โหลดไฟล์สำรอง (.json)"</strong> จากนั้นสามารถนำไฟล์ไปเก็บไว้ใน Google Drive, iCloud, OneDrive หรือส่งเข้าอีเมลเพื่อความปลอดภัยได้ตลอดเวลา
              </p>
            </div>
          </div>

          {/* Export Category Selector */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-gray-50/40 dark:bg-gray-900/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Download className="text-law-600 dark:text-law-400" size={18} />
                  เลือกหมวดหมู่ข้อมูลที่ต้องการสำรอง
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ทำเครื่องหมายถูกเฉพาะข้อมูลที่คุณต้องการนำไปใช้งานหรือจัดเก็บ
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAllExportOpts(true)}
                  className="px-2.5 py-1 text-law-700 dark:text-law-300 hover:bg-law-50 dark:hover:bg-law-900/30 rounded border border-law-200 dark:border-law-800 font-medium transition-colors"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setAllExportOpts(false)}
                  className="px-2.5 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-medium transition-colors"
                >
                  ล้างการเลือก
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Notes & Highlights & Starred & Linked Deka */}
              <div 
                onClick={() => toggleExportOpt('includeNotes')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  exportOpts.includeNotes 
                    ? 'bg-white dark:bg-gray-800 border-law-400 dark:border-law-600 shadow-xs' 
                    : 'bg-white/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="pt-0.5 text-law-600 dark:text-law-400">
                  {exportOpts.includeNotes ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <FileText size={15} className="text-amber-500" />
                      บันทึก โน้ต ไฮไลต์ และมาตราสำคัญ
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded font-medium">
                        {counts.notes} โน้ต
                      </span>
                      <span className="px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded font-medium">
                        {counts.starred} มาตราติดดาว
                      </span>
                      {counts.linkedDekas > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
                          {counts.linkedDekas} ฎีกาเชื่อมโยง
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ข้อความบันทึกส่วนตัว, ไฮไลต์สีข้อความ, เครื่องหมายดาว และฎีกาที่ผูกไว้ในแต่ละมาตรา
                  </p>
                </div>
              </div>

              {/* Option 2: Memorization SRS */}
              <div 
                onClick={() => toggleExportOpt('includeMemorization')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  exportOpts.includeMemorization 
                    ? 'bg-white dark:bg-gray-800 border-law-400 dark:border-law-600 shadow-xs' 
                    : 'bg-white/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="pt-0.5 text-law-600 dark:text-law-400">
                  {exportOpts.includeMemorization ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Brain size={15} className="text-purple-500" />
                      ชุดท่องสอบและความคืบหน้าความจำ (SRS)
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
                        {counts.memoDecks} สำรับ
                      </span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-medium">
                        {counts.memoCards} การ์ดท่องจำ
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    สำรับการ์ดท่องสอบ, รายการมาตราที่เพิ่มเข้าท่องจำ, ระดับความจำ (SRS) และสถิติการทบทวน
                  </p>
                </div>
              </div>

              {/* Option 3: Deka Bookmarks */}
              <div 
                onClick={() => toggleExportOpt('includeBookmarks')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  exportOpts.includeBookmarks 
                    ? 'bg-white dark:bg-gray-800 border-law-400 dark:border-law-600 shadow-xs' 
                    : 'bg-white/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="pt-0.5 text-law-600 dark:text-law-400">
                  {exportOpts.includeBookmarks ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Bookmark size={15} className="text-emerald-500" />
                      บุ๊กมาร์กคำพิพากษาฎีกา
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded font-medium text-[11px]">
                      {counts.bookmarks} ฎีกาที่บันทึก
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    รายการคำพิพากษาศาลฎีกาที่กดบุ๊กมาร์กจัดเก็บไว้ในระบบค้นหาฎีกา
                  </p>
                </div>
              </div>

              {/* Option 4: Custom Laws & Books */}
              <div 
                onClick={() => toggleExportOpt('includeCustomLaws')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  exportOpts.includeCustomLaws 
                    ? 'bg-white dark:bg-gray-800 border-law-400 dark:border-law-600 shadow-xs' 
                    : 'bg-white/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="pt-0.5 text-law-600 dark:text-law-400">
                  {exportOpts.includeCustomLaws ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <BookOpen size={15} className="text-blue-500" />
                      ตัวบทกฎหมายที่แก้ไขหรือสร้างใหม่เอง
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium text-[11px]">
                      {counts.customLaws} มาตรา
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ข้อความตัวบทมาตราที่ได้รับการแก้ไขเพิ่มเติม หรือหนังสือตัวบทที่สร้างขึ้นเอง
                  </p>
                </div>
              </div>

              {/* Option 5: App Settings */}
              <div 
                onClick={() => toggleExportOpt('includeSettings')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  exportOpts.includeSettings 
                    ? 'bg-white dark:bg-gray-800 border-law-400 dark:border-law-600 shadow-xs' 
                    : 'bg-white/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="pt-0.5 text-law-600 dark:text-law-400">
                  {exportOpts.includeSettings ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <SettingsIcon size={15} className="text-gray-500" />
                      การตั้งค่าแอปและการอ่านออกเสียง
                    </span>
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium text-[11px]">
                      พร้อมสำรอง
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ขนาดฟอนต์, รูปแบบตัวอักษร, เสียงอ่านไทยที่เลือก และความเร็วการอ่าน
                  </p>
                </div>
              </div>
            </div>

            {/* Export Trigger Button */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {hasAnyExportSelected 
                  ? `เลือกสำรอง ${Object.values(exportOpts).filter(Boolean).length} จาก 5 หมวดหมู่`
                  : '⚠️ โปรดเลือกอย่างน้อย 1 หมวดหมู่'}
              </span>
              <button 
                onClick={handleExport}
                disabled={!hasAnyExportSelected}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-xs ${
                  hasAnyExportSelected
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white cursor-pointer active:scale-98'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download size={17} />
                <span>ดาวน์โหลดไฟล์สำรอง (.json)</span>
              </button>
            </div>
          </div>

          {/* Import / Restore Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Upload className="text-orange-500" size={18} />
                  กู้คืนข้อมูล (Restore)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  เลือกไฟล์ .json ที่สำรองไว้ ระบบจะแสดงข้อมูลสรุปให้คุณตรวจสอบก่อนดำเนินการ
                </p>
              </div>
              <button 
                onClick={handleImportClick}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center space-x-2 shadow-xs flex-shrink-0"
              >
                <Upload size={16} />
                <span>เลือกไฟล์สำรองข้อมูล</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle size={16} />
              โซนอันตราย (Danger Zone)
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              ล้างข้อมูลทั้งหมดในเครื่องเพื่อให้แอปกลับไปเป็นค่าเริ่มต้นเดิมของระบบ
            </p>
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <AlertTriangle size={15} />
              <span>ล้างข้อมูลทั้งหมด (Factory Reset)</span>
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Pre-restore Inspection Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                    ตรวจสอบไฟล์ก่อนกู้คืน
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    พบข้อมูลในไฟล์สำรองดังรายการต่อไปนี้
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPendingRestore(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
                💡 ข้อมูลใหม่จะถูกนำเข้าและผสาน (Merge) เข้ากับข้อมูลปัจจุบันของคุณโดยอัตโนมัติ
              </div>

              <div className="space-y-2">
                {/* Notes & Starred */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <FileText size={16} className="text-amber-500" />
                    <span>บันทึก โน้ต และไฮไลต์</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {pendingRestore.summary.notesCount} บันทึก
                    </span>
                    <span className="text-gray-400 ml-1.5">
                      ({pendingRestore.summary.starredCount} ดาว, {pendingRestore.summary.linkedDekaCount} ฎีกาเชื่อมโยง)
                    </span>
                  </div>
                </div>

                {/* Memorization */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <Brain size={16} className="text-purple-500" />
                    <span>ชุดท่องสอบและความจำ (SRS)</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {pendingRestore.summary.memoDecksCount} สำรับ
                    </span>
                    <span className="text-gray-400 ml-1.5">
                      ({pendingRestore.summary.memoItemsCount} การ์ดท่องจำ)
                    </span>
                  </div>
                </div>

                {/* Bookmarks */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <Bookmark size={16} className="text-emerald-500" />
                    <span>บุ๊กมาร์กคำพิพากษาฎีกา</span>
                  </div>
                  <div className="text-right text-xs font-bold text-gray-900 dark:text-gray-100">
                    {pendingRestore.summary.bookmarksCount} รายการ
                  </div>
                </div>

                {/* Custom Laws */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <BookOpen size={16} className="text-blue-500" />
                    <span>ตัวบทที่แก้ไข/เพิ่มเอง</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {pendingRestore.summary.customLawsCount} มาตรา
                    </span>
                    {pendingRestore.summary.customBooksCount > 0 && (
                      <span className="text-gray-400 ml-1.5">
                        ({pendingRestore.summary.customBooksCount} เล่ม)
                      </span>
                    )}
                  </div>
                </div>

                {/* Settings */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <SettingsIcon size={16} className="text-gray-500" />
                    <span>การตั้งค่าแอป</span>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    {pendingRestore.summary.hasSettings ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                        <Check size={14} /> รวมอยู่ด้วย
                      </span>
                    ) : (
                      <span className="text-gray-400">ไม่มี</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                <span>ยืนยันการกู้คืนข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Error Modal */}
      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800/40 max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
              ไม่สามารถอ่านไฟล์ได้
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              {importError}
            </p>
            <button
              onClick={() => setImportError(null)}
              className="px-5 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center text-xs text-gray-400 mt-8 pb-8">
          Thai Law Mate Version 2.1.8
      </div>
    </div>
  );
};