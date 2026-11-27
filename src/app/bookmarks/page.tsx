"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bookmark,
  Star,
  Scale,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  CloudOff,
  Cloud,
  RefreshCw,
  Layers,
  List,
  Tag
} from "lucide-react";
import { useBookmarks, BookmarkItem } from "@/hooks/useBookmarks";
import BookmarkButton from "@/components/BookmarkButton";
import {
  initLawsData,
  getLaws,
  getNotes,
  saveNote,
  getBooks,
  syncAdminImportantSections
} from "@/components/law-mate/services/dataService";
import { LawSection, UserNote, LawBook } from "@/components/law-mate/types";
import { sortSectionsAscending } from "@/utils/sectionSort";
import { extractDekaLaws } from "@/utils/lawParser";

function getLawStyle(shortName: string, lawName: string) {
  const text = `${shortName} ${lawName}`;
  if (text.includes("อาญา") && !text.includes("วิธีพิจารณา")) {
    return {
      border: "border-red-200 dark:border-red-900/60",
      bgHeader: "bg-red-50/90 dark:bg-red-950/40",
      badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
      accent: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
    };
  }
  if (text.includes("แพ่งและพาณิชย์") || text.includes("ป.พ.พ.")) {
    return {
      border: "border-blue-200 dark:border-blue-900/60",
      bgHeader: "bg-blue-50/90 dark:bg-blue-950/40",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
      accent: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    };
  }
  if (text.includes("วิธีพิจารณาความแพ่ง") || text.includes("ป.วิ.พ.")) {
    return {
      border: "border-indigo-200 dark:border-indigo-900/60",
      bgHeader: "bg-indigo-50/90 dark:bg-indigo-950/40",
      badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
      accent: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
    };
  }
  if (text.includes("วิธีพิจารณาความอาญา") || text.includes("ป.วิ.อ.")) {
    return {
      border: "border-orange-200 dark:border-orange-900/60",
      bgHeader: "bg-orange-50/90 dark:bg-orange-950/40",
      badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
      accent: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
    };
  }
  if (text.includes("ล้มละลาย")) {
    return {
      border: "border-emerald-200 dark:border-emerald-900/60",
      bgHeader: "bg-emerald-50/90 dark:bg-emerald-950/40",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    };
  }
  if (text.includes("รัฐธรรมนูญ") || text.includes("รธน.")) {
    return {
      border: "border-yellow-200 dark:border-yellow-900/60",
      bgHeader: "bg-yellow-50/90 dark:bg-yellow-950/40",
      badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
      accent: "text-yellow-700 dark:text-yellow-400",
      iconBg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400",
    };
  }
  if (text.includes("ยาเสพติด")) {
    return {
      border: "border-rose-200 dark:border-rose-900/60",
      bgHeader: "bg-rose-50/90 dark:bg-rose-950/40",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
      accent: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
    };
  }
  if (text.includes("ที่ดิน")) {
    return {
      border: "border-teal-200 dark:border-teal-900/60",
      bgHeader: "bg-teal-50/90 dark:bg-teal-950/40",
      badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
      accent: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
    };
  }
  return {
    border: "border-slate-200 dark:border-slate-800",
    bgHeader: "bg-slate-50 dark:bg-slate-800/60",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    accent: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
}

export default function BookmarksPage() {
  const { bookmarks, isLoaded, syncStatus, syncMessage, retrySync } = useBookmarks();
  const [activeTab, setActiveTab] = useState<"deka" | "laws">("deka");
  const isDekaLoading =
    !isLoaded || (bookmarks.length === 0 && (syncStatus === "idle" || syncStatus === "syncing"));

  // Deka Bookmarks state
  const [dekaViewMode, setDekaViewMode] = useState<"categories" | "all">("categories");
  const [expandedLawKeys, setExpandedLawKeys] = useState<Set<string>>(new Set());
  const [dekaSearchQuery, setDekaSearchQuery] = useState<string>("");

  // Important sections state
  const [importantLaws, setImportantLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [books, setBooks] = useState<LawBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("all");
  const [isLawsLoaded, setIsLawsLoaded] = useState(false);
  const [lawSearchQuery, setLawSearchQuery] = useState("");

  const loadImportantLaws = async () => {
    if (isLawsLoaded) return;
    try {
      await initLawsData();
      await syncAdminImportantSections();
      const allNotes = getNotes();
      setNotes(allNotes);

      const allLaws = getLaws();
      const allBooks = getBooks();
      setBooks(allBooks);

      // Filter starred laws and sort strictly ascending by section number
      const starred = allLaws.filter(l => allNotes[l.id]?.isHighlighted);
      const sorted = sortSectionsAscending(starred, l => l.sectionNumber, l => l.bookId);
      setImportantLaws(sorted);
    } catch (e) {
      console.error("Failed to load important sections", e);
    } finally {
      setIsLawsLoaded(true);
    }
  };

  // Load important laws only when user visits the "laws" tab, or idle in background
  useEffect(() => {
    if (activeTab === "laws") {
      loadImportantLaws();
    }
  }, [activeTab]);

  const handleToggleLawHighlight = (law: LawSection) => {
    const currentNote = notes[law.id] || {
      sectionId: law.id,
      text: "",
      updatedAt: Date.now(),
      isHighlighted: false
    };

    const newNote = {
      ...currentNote,
      isHighlighted: !currentNote.isHighlighted,
      updatedAt: Date.now()
    };

    saveNote(newNote, {
      sectionNumber: law.sectionNumber,
      bookId: law.bookId,
      title: `มาตรา ${law.sectionNumber}`
    });

    const updatedNotes = getNotes();
    setNotes(updatedNotes);

    const allLaws = getLaws();
    const starred = allLaws.filter(l => updatedNotes[l.id]?.isHighlighted);
    const sorted = sortSectionsAscending(starred, l => l.sectionNumber, l => l.bookId);
    setImportantLaws(sorted);
  };

  // Group and index bookmarks by law (if a decision cites multiple laws, record under all of them)
  const { lawGroups, totalGroupedEntries, lawOptions, flatFilteredBookmarks } = useMemo(() => {
    const q = dekaSearchQuery.trim().toLowerCase();

    // 1. Filter raw bookmarks by search query
    const filtered = bookmarks.filter((b) => {
      if (!q) return true;
      const matchNum = b.decisionNumber.toLowerCase().includes(q);
      const matchYear = String(b.decisionYear || "").includes(q);
      const matchParties = (b.parties || "").toLowerCase().includes(q);
      const matchSummary = (b.shortSummary || "").toLowerCase().includes(q);
      const matchLaw = (b.law || "").toLowerCase().includes(q);
      return matchNum || matchYear || matchParties || matchSummary || matchLaw;
    });

    // 2. Map of LawKey -> LawGroup
    const groupMap = new Map<
      string,
      {
        lawKey: string;
        lawName: string;
        shortName: string;
        items: Array<{
          decision: BookmarkItem;
          sectionsInThisLaw: string[];
          otherLaws: Array<{ lawName: string; shortName: string }>;
        }>;
      }
    >();

    let totalGroupedCount = 0;

    for (const b of filtered) {
      const citedLaws = extractDekaLaws(b.law);

      // If this deka cites multiple laws, insert into EVERY cited law group!
      for (const lawItem of citedLaws) {
        if (!groupMap.has(lawItem.lawKey)) {
          groupMap.set(lawItem.lawKey, {
            lawKey: lawItem.lawKey,
            lawName: lawItem.lawName,
            shortName: lawItem.shortName,
            items: [],
          });
        }

        const otherLaws = citedLaws
          .filter((other) => other.lawKey !== lawItem.lawKey)
          .map((other) => ({ lawName: other.lawName, shortName: other.shortName }));

        groupMap.get(lawItem.lawKey)!.items.push({
          decision: b,
          sectionsInThisLaw: lawItem.sections,
          otherLaws,
        });

        totalGroupedCount++;
      }
    }

    // Sort law groups by item count descending, placing 'unspecified' last
    const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.lawKey === "unspecified") return 1;
      if (b.lawKey === "unspecified") return -1;
      return b.items.length - a.items.length;
    });

    const options = sortedGroups.map((g) => ({
      key: g.lawKey,
      label: g.shortName || g.lawName,
      count: g.items.length,
    }));

    return {
      lawGroups: sortedGroups,
      totalGroupedEntries: totalGroupedCount,
      lawOptions: options,
      flatFilteredBookmarks: filtered,
    };
  }, [bookmarks, dekaSearchQuery]);

  const isAllExpanded =
    lawGroups.length > 0 && lawGroups.every((g) => expandedLawKeys.has(g.lawKey));

  const toggleAllGroups = () => {
    if (isAllExpanded) {
      setExpandedLawKeys(new Set());
    } else {
      setExpandedLawKeys(new Set(lawGroups.map((g) => g.lawKey)));
    }
  };

  const toggleLawGroup = (lawKey: string) => {
    setExpandedLawKeys((prev) => {
      const next = new Set(prev);
      if (next.has(lawKey)) {
        next.delete(lawKey);
      } else {
        next.add(lawKey);
      }
      return next;
    });
  };

  const jumpToLawCategory = (lawKeyOrName: string) => {
    setDekaViewMode("categories");
    const match = lawGroups.find(
      (g) => g.lawKey === lawKeyOrName || g.lawName === lawKeyOrName || g.shortName === lawKeyOrName
    );
    const targetKey = match ? match.lawKey : lawKeyOrName;
    setExpandedLawKeys((prev) => new Set([...prev, targetKey]));
    setTimeout(() => {
      const el = document.getElementById(`law-group-${targetKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  // Filtered important laws by book and search query
  const filteredImportantLaws = importantLaws.filter(law => {
    if (selectedBookId !== "all" && law.bookId !== selectedBookId) {
      return false;
    }
    if (lawSearchQuery.trim()) {
      const q = lawSearchQuery.trim().toLowerCase();
      const matchSec = (law.sectionNumber || "").toLowerCase().includes(q);
      const matchContent = (law.content || "").toLowerCase().includes(q);
      const matchCategory = (law.category || "").toLowerCase().includes(q);
      const matchNote = (notes[law.id]?.text || "").toLowerCase().includes(q);
      return matchSec || matchContent || matchCategory || matchNote;
    }
    return true;
  });

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 font-thai">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-950/60 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">บุ๊กมาร์กของฉัน</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              คำพิพากษาและมาตราสำคัญที่คุณบันทึกไว้
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("deka")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "deka"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>คำพิพากษาศาลฎีกา</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
              {isLoaded ? bookmarks.length : 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("laws")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "laws"
                ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Star className="w-4 h-4 text-amber-500" fill="currentColor" />
            <span>มาตราสำคัญ</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
              {isLawsLoaded ? importantLaws.length : 0}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Deka Bookmarks */}
      {activeTab === "deka" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* Sync status */}
          {syncStatus === "synced" && (
            <div className="flex items-center gap-2 px-1 text-xs text-emerald-700 dark:text-emerald-400">
              <Cloud className="w-3.5 h-3.5" />
              <span>ซิงค์กับเซิร์ฟเวอร์แล้ว — ใช้ได้ทุกเครื่องที่เข้าสู่ระบบแอดมิน</span>
            </div>
          )}
          {syncStatus === "local-only" && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm">
              <CloudOff className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">บุ๊กมาร์กเก็บในเครื่องนี้เท่านั้น</p>
                <p className="text-xs mt-0.5 opacity-90">
                  ต้องเข้าสู่ระบบด้วยบัญชีแอดมิน (อีเมลต้องอยู่ใน ADMIN_EMAILS) จึงจะซิงค์ข้ามเครื่องได้
                </p>
              </div>
            </div>
          )}
          {syncStatus === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-sm">
              <CloudOff className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">ซิงค์กับเซิร์ฟเวอร์ไม่สำเร็จ</p>
                {syncMessage && <p className="text-xs mt-0.5 opacity-90 break-words">{syncMessage}</p>}
                <p className="text-xs mt-0.5 opacity-90">ข้อมูลยังอยู่ในเครื่องนี้ และจะลองซิงค์ใหม่ให้อัตโนมัติ</p>
              </div>
              <button
                onClick={() => void retrySync()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ลองอีกครั้ง
              </button>
            </div>
          )}

          {isDekaLoading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">ยังไม่มีข้อมูลบุ๊กมาร์กคำพิพากษา</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                คุณสามารถบันทึกคำพิพากษาฎีกาที่สนใจได้โดยกดที่ไอคอนรูปบุ๊กมาร์กในหน้าค้นหา
              </p>
              <Link
                href="/search"
                className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                ไปค้นหาคำพิพากษา
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controls: Search & View Mode Switcher */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={dekaSearchQuery}
                      onChange={(e) => setDekaSearchQuery(e.target.value)}
                      placeholder="ค้นหาในบุ๊กมาร์ก (เลขฎีกา, ชื่อกฎหมาย, คู่ความ, ข้อความ)..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  </div>

                  {/* Mode switcher: Categories vs Flat list */}
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setDekaViewMode("categories")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        dekaViewMode === "categories"
                          ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="แสดงแยกตามหมวดกฎหมาย"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>หมวดกฎหมาย</span>
                    </button>

                    <button
                      onClick={() => setDekaViewMode("all")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        dekaViewMode === "all"
                          ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="แสดงรายการทั้งหมดในหน้ารวม"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>แสดงทั้งหมด ({bookmarks.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Categories (เหมือนหน้าแยกฎีกาตามกฎหมาย) */}
              {dekaViewMode === "categories" ? (
                <div className="space-y-4">
                  {/* Category Overview Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        พบ <strong className="text-slate-900 dark:text-white font-bold">{lawGroups.length}</strong> หมวดกฎหมาย
                        {" "}(รวม <strong className="text-slate-900 dark:text-white font-bold">{totalGroupedEntries}</strong> รายการอ้างอิง)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <button
                        onClick={() => setDekaViewMode("all")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer"
                        title="กดเพื่อดูคำพิพากษาทั้งหมดในหน้ารวม"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>แสดงทั้งหมดในหน้ารวม ({bookmarks.length})</span>
                      </button>

                      <button
                        onClick={toggleAllGroups}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                        title={isAllExpanded ? "ยุบทุกหมวด" : "กางทุกหมวด"}
                      >
                        {isAllExpanded ? "ยุบทุกหมวด" : "กางทุกหมวด"}
                      </button>
                    </div>
                  </div>

                  {lawGroups.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                      <p className="text-slate-500">ไม่พบคำพิพากษาที่ตรงกับการค้นหา</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lawGroups.map((group) => {
                        const style = getLawStyle(group.shortName, group.lawName);
                        const isExpanded =
                          Boolean(dekaSearchQuery.trim()) || expandedLawKeys.has(group.lawKey);

                        return (
                          <div
                            id={`law-group-${group.lawKey}`}
                            key={group.lawKey}
                            className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden shadow-xs ${
                              isExpanded
                                ? `${style.border} ring-1 ${style.border}`
                                : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            {/* Card Header (clickable accordion trigger like /search/law) */}
                            <button
                              onClick={() => toggleLawGroup(group.lawKey)}
                              className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors cursor-pointer group ${
                                isExpanded ? style.bgHeader : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div
                                  className={`p-2.5 rounded-xl ${style.iconBg} shrink-0 group-hover:scale-105 transition-transform`}
                                >
                                  <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {group.lawName}
                                    </h2>
                                    {group.shortName && group.shortName !== group.lawName && (
                                      <span
                                        className={`text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0 ${style.badge}`}
                                      >
                                        {group.shortName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    {isExpanded ? "คลิกเพื่อย่อปิด" : "คลิกเพื่อเปิดดูคำพิพากษาในหมวดนี้"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold group-hover:bg-indigo-50 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300 transition-colors">
                                  {group.items.length} ฎีกา
                                </span>
                                <ChevronDown
                                  className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-indigo-600" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Expanded List of Decisions */}
                            {isExpanded && (
                              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                                {group.items.map(({ decision, sectionsInThisLaw, otherLaws }) => (
                                  <div
                                    key={`${group.lawKey}-${decision.id}`}
                                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:shadow-xs transition-all group/item"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <Link href={`/decision/${decision.id}`} className="block">
                                          <h3 className="text-base sm:text-lg font-bold text-indigo-700 dark:text-indigo-400 group-hover/item:underline transition-colors">
                                            คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                                          </h3>
                                        </Link>
                                        {decision.decisionYear && (
                                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                            ปี {decision.decisionYear}
                                          </span>
                                        )}
                                      </div>
                                      <BookmarkButton decision={decision} />
                                    </div>

                                    {decision.parties && (
                                      <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium mb-2.5">
                                        <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                                        {decision.parties}
                                      </p>
                                    )}

                                    {decision.shortSummary && (
                                      <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-3">
                                        {decision.shortSummary}
                                      </p>
                                    )}

                                    {/* Specific Sections in this Law */}
                                    {sectionsInThisLaw && sectionsInThisLaw.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                          มาตราในฉบับนี้:
                                        </span>
                                        {sectionsInThisLaw.map((sec, sIdx) => (
                                          <span
                                            key={sIdx}
                                            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100/90 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                          >
                                            ม. {sec}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Multi-Law Cross References */}
                                    {otherLaws && otherLaws.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-xs">
                                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                          <Layers className="w-3 h-3 text-slate-400" />
                                          เกี่ยวข้องกับกฎหมายอื่นด้วย:
                                        </span>
                                        {otherLaws.map((other, oIdx) => (
                                          <button
                                            key={oIdx}
                                            onClick={() => jumpToLawCategory(other.lawName)}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                            title={`คลิกเพื่อเปิดดูหมวด ${other.lawName}`}
                                          >
                                            {other.shortName || other.lawName}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                      <span className="text-[11px] text-slate-400">
                                        บันทึกเมื่อ {new Date(decision.timestamp).toLocaleDateString("th-TH")}
                                      </span>
                                      <Link
                                        href={`/decision/${decision.id}`}
                                        className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                      >
                                        อ่านฉบับเต็ม <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* View 2: Flat List ("แสดงทั้งหมดในหน้ารวม") */
                <div className="space-y-4">
                  {/* Top Bar for Flat List */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        แสดงคำพิพากษาทั้งหมดในหน้ารวม <strong className="text-slate-900 dark:text-white font-bold">{flatFilteredBookmarks.length}</strong> รายการ
                      </span>
                    </div>

                    <button
                      onClick={() => setDekaViewMode("categories")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer self-end sm:self-auto"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>ดูแยกตามหมวดกฎหมาย ({lawGroups.length} หมวด)</span>
                    </button>
                  </div>

                  {flatFilteredBookmarks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                      <p className="text-slate-500">ไม่พบคำพิพากษาที่ตรงกับการค้นหา</p>
                    </div>
                  ) : (
                    flatFilteredBookmarks.map((decision) => {
                      const laws = extractDekaLaws(decision.law);
                      return (
                        <div
                          key={decision.id}
                          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Link href={`/decision/${decision.id}`} className="block">
                                <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 group-hover:underline transition-colors">
                                  คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                                </h2>
                              </Link>
                              {decision.decisionYear && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-0.5 rounded-full text-xs font-semibold">
                                  ปี {decision.decisionYear}
                                </span>
                              )}
                            </div>
                            <BookmarkButton decision={decision} />
                          </div>

                          {decision.parties && (
                            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-2.5">
                              <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                              {decision.parties}
                            </p>
                          )}

                          {decision.shortSummary && (
                            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed mb-3">
                              {decision.shortSummary}
                            </p>
                          )}

                          {/* Laws Tag List */}
                          {laws.length > 0 && laws[0].lawKey !== "unspecified" && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                กฎหมายที่เกี่ยวข้อง:
                              </span>
                              {laws.map((l, lIdx) => (
                                <button
                                  key={lIdx}
                                  onClick={() => jumpToLawCategory(l.lawKey)}
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 transition-colors cursor-pointer"
                                  title={`คลิกเพื่อเปิดดูหมวด ${l.lawName}`}
                                >
                                  {l.shortName || l.lawName}
                                  {l.sections.length > 0 ? ` (ม. ${l.sections.join(", ")})` : ""}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-400">
                              บันทึกเมื่อ {new Date(decision.timestamp).toLocaleDateString("th-TH")}
                            </span>
                            <Link
                              href={`/decision/${decision.id}`}
                              className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              อ่านฉบับเต็ม <ChevronRight className="w-4 h-4 ml-0.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Important Sections (มาตราสำคัญ เรียงตามเลขมาตราจากน้อยไปหามาก) */}
      {activeTab === "laws" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* Controls: Search and Book Filter */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="relative">
              <input
                type="text"
                value={lawSearchQuery}
                onChange={(e) => setLawSearchQuery(e.target.value)}
                placeholder="ค้นหาในมาตราสำคัญ (เช่น เลขมาตรา หรือเนื้อหา)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            </div>

            {/* Book Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedBookId("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedBookId === "all"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                ทั้งหมด ({importantLaws.length})
              </button>

              {books.map((b) => {
                const count = importantLaws.filter((l) => l.bookId === b.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBookId(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedBookId === b.id
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {b.abbreviation} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {!isLawsLoaded ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : filteredImportantLaws.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <Star className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {importantLaws.length === 0 ? "ยังไม่มีมาตราสำคัญที่บันทึกไว้" : "ไม่พบมาตราที่ตรงกับการค้นหา"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {importantLaws.length === 0
                  ? "กดไอคอนดาว (⭐) ในหน้าอ่านตัวบทกฎหมาย เพื่อบันทึกมาตราสำคัญสำหรับการท่องสอบและทบทวน"
                  : "ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่กฎหมาย"}
              </p>
              {importantLaws.length === 0 && (
                <Link
                  href="/laws"
                  className="inline-block mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  ไปอ่านตัวบทกฎหมาย
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                <span>
                  เรียงตามเลขมาตราจากน้อยไปหามาก ({filteredImportantLaws.length} มาตรา)
                </span>
                <span className="text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60 font-semibold">
                  Ascending numerical order
                </span>
              </div>

              {filteredImportantLaws.map((law) => {
                const lawBook = books.find((b) => b.id === law.bookId);
                const note = notes[law.id];

                return (
                  <div
                    key={law.id}
                    className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xs border border-amber-300/80 dark:border-amber-700/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-amber-800 dark:text-amber-300">
                            มาตรา {law.sectionNumber}
                          </span>
                          {lawBook && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              {lawBook.name}
                            </span>
                          )}
                          {law.category && (
                            <span className="text-xs text-slate-400">
                              · {law.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleLawHighlight(law)}
                        className="p-1.5 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        title="ยกเลิกการบันทึกมาตรานี้"
                      >
                        <Star size={20} fill="currentColor" />
                      </button>
                    </div>

                    {/* Content Preview */}
                    <p className="text-slate-800 dark:text-slate-200 text-sm line-clamp-3 leading-relaxed mb-4">
                      {law.content}
                    </p>

                    {/* Note if any */}
                    {note?.text && (
                      <div className="mb-4 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 dark:text-amber-200 line-clamp-2">
                          <span className="font-bold mr-1">โน้ต:</span>
                          {note.text}
                        </p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/search?tab=law&section=${encodeURIComponent(law.sectionNumber)}`}
                          className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          ค้นหาฎีกาที่เกี่ยวข้อง
                        </Link>
                      </div>

                      <Link
                        href={`/laws#/${law.bookId || 'crim'}?s=${encodeURIComponent(law.sectionNumber)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs"
                      >
                        <span>เปิดอ่านตัวบทฉบับเต็ม</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
