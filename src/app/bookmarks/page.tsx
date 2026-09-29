"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Star, Scale, BookOpen, ChevronRight, Search, Trash2, ExternalLink } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
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

export default function BookmarksPage() {
  const { bookmarks, isLoaded } = useBookmarks();
  const [activeTab, setActiveTab] = useState<"deka" | "laws">("deka");

  // Important sections state
  const [importantLaws, setImportantLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [books, setBooks] = useState<LawBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("all");
  const [isLawsLoaded, setIsLawsLoaded] = useState(false);
  const [lawSearchQuery, setLawSearchQuery] = useState("");

  const loadImportantLaws = async () => {
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

  useEffect(() => {
    loadImportantLaws();
  }, []);

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
          {!isLoaded ? (
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
              {bookmarks.map((decision) => (
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
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-3">
                      <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                      {decision.parties}
                    </p>
                  )}

                  {decision.shortSummary && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed mb-4">
                      {decision.shortSummary}
                    </p>
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
              ))}
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
