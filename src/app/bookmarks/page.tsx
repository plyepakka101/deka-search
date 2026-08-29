"use client";

import Link from "next/link";
import { Bookmark, Search, ChevronRight } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import BookmarkButton from "@/components/BookmarkButton";

export default function BookmarksPage() {
  const { bookmarks, isLoaded } = useBookmarks();

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-100 p-3 rounded-full">
          <Bookmark className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">บุ๊กมาร์กของฉัน</h1>
          <p className="text-slate-500 mt-1">
            คำพิพากษาที่คุณบันทึกไว้ ({isLoaded ? bookmarks.length : 0} รายการ)
          </p>
        </div>
      </div>

      {!isLoaded ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">ยังไม่มีข้อมูลบุ๊กมาร์ก</h3>
          <p className="text-slate-500 mt-1">คุณสามารถบันทึกคำพิพากษาที่สนใจได้โดยกดที่ไอคอนรูปบุ๊กมาร์ก</p>
          <Link href="/search" className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
            ไปค้นหาคำพิพากษา
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((decision) => (
            <div key={decision.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent/30 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <Link href={`/decision/${decision.id}`} className="block">
                    <h2 className="text-xl font-bold text-primary group-hover:text-accent transition-colors">
                      คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                    </h2>
                  </Link>
                  {decision.decisionYear && (
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                      ปี {decision.decisionYear}
                    </span>
                  )}
                </div>
                <BookmarkButton decision={decision} />
              </div>
              
              {decision.parties && (
                <p className="text-slate-700 font-medium mb-3">
                  <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                  {decision.parties}
                </p>
              )}
              
              {decision.shortSummary && (
                <p className="text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  {decision.shortSummary}
                </p>
              )}

              <Link href={`/decision/${decision.id}`} className="inline-flex items-center text-sm font-semibold text-accent hover:text-primary transition-colors">
                อ่านฉบับเต็ม <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
