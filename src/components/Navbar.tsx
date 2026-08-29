"use client";

import Link from "next/link";
import { Scale, Menu, X, UserCircle, BookOpen, Bookmark } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-1.5 rounded-lg group-hover:bg-accent transition-colors">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-primary">Deka Search</span>
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="text-slate-600 hover:text-primary transition-colors">หน้าแรก</Link>
              <Link href="/search?tab=law" className="text-slate-600 hover:text-primary transition-colors">แยกตามกฎหมาย</Link>
              <Link href="/search?tab=year" className="text-slate-600 hover:text-primary transition-colors">แยกตามปี พ.ศ.</Link>
              <Link href="/laws" className="text-slate-600 hover:text-primary transition-colors flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                ตัวบทกฎหมาย
              </Link>
              <Link href="/bookmarks" className="text-slate-600 hover:text-primary transition-colors flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                บุ๊กมาร์ก
              </Link>
              <Link href="/admin/import" className="text-slate-600 hover:text-primary transition-colors">นำเข้าคำพิพากษา</Link>
              <Link href="/admin/import-law" className="text-slate-600 hover:text-primary transition-colors">นำเข้ากฎหมาย</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
              <UserCircle className="w-5 h-5" />
              เข้าสู่ระบบ
            </button>
            
            {/* Mobile Menu Toggle */}
          <button 
            type="button"
            className="md:hidden p-2 text-slate-600 active:bg-slate-100 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>

      {/* Mobile Nav Dropdown (Moved outside header to avoid backdrop-blur containing block issue) */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-white shadow-2xl z-[100] overflow-y-auto">
          <nav className="flex flex-col p-6 gap-6 text-lg font-medium">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">หน้าแรก</Link>
            <Link href="/search?tab=law" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">แยกตามกฎหมาย</Link>
            <Link href="/search?tab=year" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">แยกตามปี พ.ศ.</Link>
            <Link href="/laws" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              ตัวบทกฎหมาย
            </Link>
            <Link href="/bookmarks" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors flex items-center gap-3">
              <Bookmark className="w-6 h-6" />
              บุ๊กมาร์ก
            </Link>
            <Link href="/admin/import" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">นำเข้าคำพิพากษา</Link>
            <Link href="/admin/import-law" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">นำเข้ากฎหมาย</Link>
            <hr className="border-slate-100 my-2" />
            <button className="flex items-center justify-center gap-3 text-slate-600 hover:text-primary transition-colors w-full py-4 bg-slate-50 rounded-xl">
              <UserCircle className="w-6 h-6" />
              เข้าสู่ระบบ
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
