
"use client";

import Link from "next/link";
import { Scale, Menu, X, UserCircle, BookOpen, Bookmark, LogOut } from "lucide-react";
import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

export default function Navbar({ session }: { session: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = session?.user?.isAdmin;

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
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Admin Buttons - Desktop Only */}
            {isAdmin && (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/admin/import" className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  นำเข้าคำพิพากษา
                </Link>
                <Link href="/admin/import-law" className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  นำเข้ากฎหมาย
                </Link>
              </div>
            )}
            
            {/* Login / Avatar Desktop */}
            <div className="hidden md:flex items-center gap-3 border-l pl-4 border-slate-200">
              {session ? (
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full border border-slate-200" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-slate-400" />
                  )}
                  <button onClick={() => signOut()} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="ออกจากระบบ">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => signIn('google')} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                  <UserCircle className="w-5 h-5" />
                  เข้าสู่ระบบ
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
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
            
            {isAdmin && (
              <>
                <Link href="/admin/import" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">นำเข้าคำพิพากษา</Link>
                <Link href="/admin/import-law" onClick={() => setIsMenuOpen(false)} className="text-slate-600 hover:text-primary transition-colors">นำเข้ากฎหมาย</Link>
              </>
            )}
            
            <hr className="border-slate-100 my-2" />
            
            {session ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
                  {session.user.image ? (
                    <img src={session.user.image} alt="User" className="w-10 h-10 rounded-full border border-slate-200" />
                  ) : (
                    <UserCircle className="w-10 h-10 text-slate-400" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{session.user.name}</span>
                    <span className="text-xs text-slate-500">{session.user.email}</span>
                  </div>
                </div>
                <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 transition-colors w-full py-4 rounded-xl">
                  <LogOut className="w-6 h-6" />
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button onClick={() => { signIn('google'); setIsMenuOpen(false); }} className="flex items-center justify-center gap-3 text-slate-600 hover:text-primary transition-colors w-full py-4 bg-slate-50 rounded-xl">
                <UserCircle className="w-6 h-6" />
                เข้าสู่ระบบ
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

