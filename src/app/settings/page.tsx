"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Settings,
  Monitor,
  Moon,
  Sun,
  Type,
  Volume2,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Shield,
  User,
  Database,
  BookOpen,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  Play,
  Bookmark,
  Brain,
  FileText
} from "lucide-react";
import {
  getSettings,
  saveSettings,
  exportData,
  importData,
  inspectBackupData,
  resetData,
  DEFAULT_EXPORT_OPTIONS,
  ImportSummary,
} from "@/components/law-mate/services/dataService";
import { AppSettings, ExportOptions } from "@/components/law-mate/types";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = Boolean((session?.user as any)?.isAdmin);

  // Tabs
  const [activeTab, setActiveTab] = useState<"appearance" | "tts" | "data" | "admin" | "account">("appearance");

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    fontSize: 16,
    fontStyle: "modern",
    lineHeight: 1.8,
    voiceURI: "",
    speakingRate: 1.0,
  });

  // Export & counts
  const [exportOpts, setExportOpts] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [counts, setCounts] = useState({
    notes: 0,
    starred: 0,
    linkedDekas: 0,
    memoDecks: 0,
    memoCards: 0,
    bookmarks: 0,
    customLaws: 0,
  });

  // Restore Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    content: string;
    summary: ImportSummary;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // TTS Voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  // Status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial settings & counts
  useEffect(() => {
    const saved = getSettings();
    const savedDark = localStorage.getItem("deka_dark_mode");
    const isDark = savedDark !== null ? savedDark === "true" : saved.darkMode;
    const savedSize = localStorage.getItem("preferred-font-size");
    const fontSize = savedSize ? parseInt(savedSize, 10) : saved.fontSize || 16;

    setSettings({
      ...saved,
      darkMode: isDark,
      fontSize: fontSize,
    });

    // Counts
    try {
      const rawNotes = localStorage.getItem("thai_law_mate_notes");
      let notes = 0, starred = 0, linkedDekas = 0;
      if (rawNotes) {
        const parsed = JSON.parse(rawNotes);
        notes = Object.keys(parsed).length;
        Object.values(parsed).forEach((n: any) => {
          if (n.isHighlighted) starred++;
          if (n.linkedDekaIds && Array.isArray(n.linkedDekaIds)) linkedDekas += n.linkedDekaIds.length;
        });
      }

      const rawDecks = localStorage.getItem("thai_law_mate_memo_decks");
      const memoDecks = rawDecks ? JSON.parse(rawDecks).length : 0;

      const rawItems = localStorage.getItem("thai_law_mate_memo_items");
      const memoCards = rawItems ? JSON.parse(rawItems).length : 0;

      const rawBookmarks = localStorage.getItem("deka_bookmarks");
      const bookmarks = rawBookmarks ? JSON.parse(rawBookmarks).length : 0;

      const rawCustom = localStorage.getItem("thai_law_mate_custom_laws");
      const customLaws = rawCustom ? JSON.parse(rawCustom).length : 0;

      setCounts({ notes, starred, linkedDekas, memoDecks, memoCards, bookmarks, customLaws });
    } catch (e) {
      console.error(e);
    }

    // TTS Voices
    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update setting helper
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);

    if (key === "darkMode") {
      const isDark = Boolean(value);
      localStorage.setItem("deka_dark_mode", isDark ? "true" : "false");
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    if (key === "fontSize") {
      const size = Number(value);
      localStorage.setItem("preferred-font-size", size.toString());
      document.documentElement.style.setProperty("--content-font-size", `${size}px`);
    }

    showToast("บันทึกการตั้งค่าแล้ว");
  };

  // TTS Test Voice
  const handleTestVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("เบราว์เซอร์นี้ไม่รองรับระบบอ่านออกเสียง");
      return;
    }
    window.speechSynthesis.cancel();
    const testText = "ทดสอบการอ่านออกเสียง มาตรา 420 ผู้ใดจงใจหรือประมาทเลินเล่อ ทำต่อบุคคลอื่นโดยผิดกฎหมาย";
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.lang = "th-TH";
    utterance.rate = settings.speakingRate || 1.0;

    if (settings.voiceURI) {
      const selected = voices.find(v => v.voiceURI === settings.voiceURI);
      if (selected) utterance.voice = selected;
    } else {
      const thaiVoice = voices.find(v => v.lang.includes("th"));
      if (thaiVoice) utterance.voice = thaiVoice;
    }

    utterance.onstart = () => setIsPlayingTestVoice(true);
    utterance.onend = () => setIsPlayingTestVoice(false);
    utterance.onerror = () => setIsPlayingTestVoice(false);

    window.speechSynthesis.speak(utterance);
  };

  // Export Data
  const handleExport = () => {
    const data = exportData(exportOpts);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deka-search-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลดไฟล์สำรองเรียบร้อย");
  };

  // Import file handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const inspection = inspectBackupData(content);
      if (!inspection.valid || !inspection.summary) {
        setImportError(inspection.error || "ไฟล์ไม่ถูกต้อง หรือรูปแบบข้อมูลผิดพลาด");
        return;
      }
      setPendingRestore({
        content,
        summary: inspection.summary,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    const ok = importData(pendingRestore.content);
    if (ok) {
      alert("กู้คืนข้อมูลสำเร็จ ระบบจะรีโหลดเพื่อใช้งานข้อมูลใหม่");
      window.location.reload();
    } else {
      alert("เกิดข้อผิดพลาดในการกู้คืนข้อมูล");
    }
  };

  const handleResetData = () => {
    if (confirm("คำเตือน: คุณต้องการล้างข้อมูลส่วนตัวในอุปกรณ์นี้ทั้งหมดใช่หรือไม่?\n\nข้อมูลโน้ต, การ์ดท่องจำ, และบุ๊กมาร์กจะถูกลบทั้งหมด (ยกเว้นมีไฟล์สำรอง Backup)")) {
      resetData();
      alert("ล้างข้อมูลเรียบร้อยแล้ว");
      window.location.reload();
    }
  };

  const thaiVoices = voices.filter(v => v.lang.includes("th"));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-thai transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shrink-0 shadow-2xs">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                การตั้งค่าระบบ (Settings)
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                ปรับแต่งหน้าจอ ขนาดตัวอักษร เสียงอ่าน และสำรองข้อมูลส่วนบุคคล
              </p>
            </div>
          </div>

          {/* Quick theme pill button */}
          <button
            onClick={() => updateSetting("darkMode", !settings.darkMode)}
            className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            {settings.darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>โหมดสว่าง (Light)</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>โหมดมืด (Dark)</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "appearance"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>การแสดงผล & ฟอนต์</span>
          </button>

          <button
            onClick={() => setActiveTab("tts")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "tts"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>เสียงอ่าน (TTS)</span>
          </button>

          <button
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "data"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>สำรองข้อมูลส่วนตัว</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <Shield className="w-4 h-4 text-amber-500" />
              <span>จัดการระบบ (Admin)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "account"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>บัญชีผู้ใช้</span>
          </button>
        </div>

        {/* Tab 1: Appearance & Font */}
        {activeTab === "appearance" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>การแสดงผลและขนาดตัวอักษร</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                การตั้งค่าในหน้านี้จะมีผลกับทุกหน้าในระบบ (หน้าค้นหาฎีกา, ตัวบทกฎหมาย, ท่องสอบ, และคลังข้อสอบ)
              </p>
            </div>

            {/* Dark Mode Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  โหมดมืด (Dark Theme)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  ถนอมสายตาสำหรับการอ่านตัวบทกฎหมายและฎีกาในที่แสงน้อย
                </div>
              </div>
              <button
                onClick={() => updateSetting("darkMode", !settings.darkMode)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                  settings.darkMode ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    settings.darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-slate-500" />
                    <span>ขนาดตัวอักษรเนื้อหา (Content Font Size)</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ปรับขนาดตัวอักษรของตัวบทกฎหมาย ธงคำตอบ และฎีกา
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  {settings.fontSize || 16} px
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">ก (เล็ก 14)</span>
                <input
                  type="range"
                  min="14"
                  max="26"
                  step="1"
                  value={settings.fontSize || 16}
                  onChange={(e) => updateSetting("fontSize", parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-base font-bold text-slate-700 dark:text-slate-300">ก (ใหญ่ 26)</span>
              </div>

              {/* Preview Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                <div className="text-xs font-semibold text-slate-400 mb-2">ตัวอย่างการแสดงผล:</div>
                <p 
                  className="text-slate-800 dark:text-slate-200 leading-relaxed" 
                  style={{ fontSize: `${settings.fontSize || 16}px`, lineHeight: settings.lineHeight || 1.8 }}
                >
                  มาตรา ๔๒๐ ผู้ใดจงใจหรือประมาทเลินเล่อ ทำต่อบุคคลอื่นโดยผิดกฎหมายให้เขาเสียหายถึงแก่ชีวิตก็ดี แก่ร่างกายก็ดี แก่อนามัยก็ดี เสรีภาพก็ดี ทรัพย์สินหรือสิทธิอย่างหนึ่งอย่างใดก็ดี ท่านว่าผู้นั้นทำละเมิดจำต้องใช้ค่าสินไหมทดแทนเพื่อการนั้น
                </p>
              </div>
            </div>

            {/* Line Height Selector */}
            <div className="space-y-3">
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                ระยะห่างบรรทัด (Line Spacing)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "กระชับ (1.5)", val: 1.5 },
                  { label: "ปกติ อ่านสบาย (1.8)", val: 1.8 },
                  { label: "โปร่งพิเศษ (2.0)", val: 2.0 },
                ].map((lh) => (
                  <button
                    key={lh.val}
                    onClick={() => updateSetting("lineHeight", lh.val)}
                    className={`py-3 px-4 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      settings.lineHeight === lh.val
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Text-to-Speech */}
        {activeTab === "tts" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>การอ่านออกเสียงข้อความ (Text-to-Speech)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ใช้สำหรับฟังก์ชันกดฟังเสียงอ่านตัวบทกฎหมายและคำพิพากษาฎีกา
              </p>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                เลือกเสียงภาษาไทย
              </label>
              <select
                value={settings.voiceURI || ""}
                onChange={(e) => updateSetting("voiceURI", e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="">เสียงเริ่มต้นของระบบ (Default Thai Voice)</option>
                {thaiVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                * รายชื่อเสียงขึ้นอยู่กับระบบปฏิบัติการและบราวเซอร์ของผู้ใช้ (เช่น Google, Microsoft หรือ Siri)
              </p>
            </div>

            {/* Speaking Rate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  ความเร็วในการอ่าน
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {settings.speakingRate || 1.0}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.25"
                value={settings.speakingRate || 1.0}
                onChange={(e) => updateSetting("speakingRate", parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0.5x (ช้ามาก)</span>
                <span>1.0x (ปกติ)</span>
                <span>1.5x (เร็ว)</span>
                <span>2.0x (เร็วมาก)</span>
              </div>
            </div>

            {/* Test Voice Button */}
            <div className="pt-2">
              <button
                onClick={handleTestVoice}
                disabled={isPlayingTestVoice}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-4 h-4 ${isPlayingTestVoice ? "animate-spin" : ""}`} />
                <span>{isPlayingTestVoice ? "กำลังทดสอบเสียง..." : "ทดสอบเสียงอ่าน"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Personal Data Backup & Restore */}
        {activeTab === "data" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>สำรองและกู้คืนข้อมูลส่วนบุคคล (Backup & Restore)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                จัดการข้อมูลที่ท่านบันทึกไว้ในเบราว์เซอร์ ทั้งโน้ตย่อ, มาตราสำคัญ, การ์ดท่องจำ และบุ๊กมาร์ก
              </p>
            </div>

            {/* Storage Counts Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>บันทึกย่อ</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {counts.notes}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span>ฎีกาที่บุ๊กมาร์ก</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {counts.bookmarks}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span>การ์ดท่องสอบ</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {counts.memoCards}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>มาตราติดดาว</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {counts.starred}
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    สำรองข้อมูล (Export Backup File)
                  </div>
                  <div className="text-xs text-slate-500">
                    ดาวน์โหลดเป็นไฟล์ .json เพื่อเก็บไว้หรือนำไปกู้คืนในอุปกรณ์อื่น
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์สำรอง</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {[
                  { key: "includeNotes", label: "บันทึกย่อและมาตราติดดาว (Notes & Starred)", count: counts.notes },
                  { key: "includeMemorization", label: "สำรับและการ์ดท่องสอบ (Flashcards)", count: counts.memoCards },
                  { key: "includeBookmarks", label: "ฎีกาที่บุ๊กมาร์ก (Bookmarks)", count: counts.bookmarks },
                  { key: "includeSettings", label: "การตั้งค่าส่วนบุคคล (Settings)", count: null },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((exportOpts as any)[item.key])}
                      onChange={() => setExportOpts(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{item.label}</span>
                    {item.count !== null && (
                      <span className="text-[10px] text-slate-400 font-semibold">({item.count})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Restore Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  กู้คืนข้อมูล (Restore Backup File)
                </div>
                <div className="text-xs text-slate-500">
                  นำเข้าไฟล์ .json ที่เคยสำรองไว้ (มีหน้าต่างพรีวิวก่อนเขียนทับ)
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>เลือกไฟล์กู้คืน</span>
              </button>
            </div>

            {/* Reset Data Section */}
            <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-rose-800 dark:text-rose-300">
                  ล้างข้อมูลส่วนตัวในเครื่อง (Reset Local Cache)
                </div>
                <div className="text-xs text-rose-600/80 dark:text-rose-400">
                  ลบข้อมูลโน้ต, การ์ดท่องจำ และบุ๊กมาร์กทั้งหมดในเบราว์เซอร์นี้
                </div>
              </div>
              <button
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ล้างข้อมูล</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Admin Tools (Admin Only) */}
        {activeTab === "admin" && isAdmin && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>เครื่องมือผู้ดูแลระบบ (Admin Control Center)</span>
                </h2>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                  จัดการข้อมูลส่วนกลางที่มีผลต่อผู้ใช้ทุกคนในระบบ (บันทึกลงฐานข้อมูล Turso)
                </p>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-1 bg-amber-500 text-white rounded-lg shadow-2xs">
                ADMIN ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/admin/import"
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      นำเข้าคำพิพากษาศาลฎีกา
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      อัปโหลดไฟล์คำพิพากษาเข้าสู่ฐานข้อมูลกลาง 69,000+ ฎีกา
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/import-law"
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      นำเข้าตัวบทกฎหมาย
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      เพิ่มหรืออัปเดตประมวลกฎหมายและ พ.ร.บ. สำคัญ
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/import-exam"
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      นำเข้าข้อสอบอัตนัย (Smart Parser)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      วิเคราะห์ข้อสอบ แยกประเด็นวินิจฉัย และเชื่อมมาตรา/ฎีกาอัตโนมัติ
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/fix-data"
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                      ตรวจสอบและซ่อมแซมข้อมูล
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      แก้ไขความสัมพันธ์ของมาตราและฎีกาในระบบ
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 5: Account Profile */}
        {activeTab === "account" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>ข้อมูลบัญชีผู้ใช้ (Account Profile)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                สถานะการเข้าสู่ระบบและสิทธิ์การใช้งาน
              </p>
            </div>

            {session?.user ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-16 h-16 rounded-full border-2 border-indigo-200 dark:border-indigo-800 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {session.user.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {session.user.email}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAdmin 
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                      }`}>
                        {isAdmin ? "ผู้ดูแลระบบ (Admin)" : "ผู้ใช้งานทั่วไป (Standard User)"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => signOut()}
                  className="px-5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
                >
                  ออกจากระบบ (Sign Out)
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ท่านยังไม่ได้เข้าสู่ระบบ เข้าสู่ระบบเพื่อซิงก์ข้อมูลและใช้งานคุณสมบัติขั้นสูง
                </p>
                <button
                  onClick={() => signIn("google")}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  เข้าสู่ระบบด้วย Google
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Restore Inspection Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  ตรวจสอบข้อมูลที่จะกู้คืน
                </h3>
              </div>
              <button
                onClick={() => setPendingRestore(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              พบข้อมูลในไฟล์สำรองดังนี้ กรุณาตรวจสอบก่อนยืนยันการกู้คืน:
            </p>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-600 dark:text-slate-400">บันทึกย่อ (Notes)</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.notesCount} รายการ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-600 dark:text-slate-400">มาตราสำคัญติดดาว</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.starredCount} รายการ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-600 dark:text-slate-400">สำรับท่องสอบ (Decks)</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.memoDecksCount} สำรับ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-600 dark:text-slate-400">การ์ดท่องสอบ (Cards)</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.memoItemsCount} ใบ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-600 dark:text-slate-400">ฎีกาที่บุ๊กมาร์ก</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.bookmarksCount} รายการ</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">การตั้งค่า</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingRestore.summary.hasSettings ? "มีในไฟล์" : "ไม่มี"}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPendingRestore(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors shadow-xs"
              >
                ยืนยันการกู้คืน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
