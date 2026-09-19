"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Scale, Menu, X, UserCircle, BookOpen, Bookmark, LogOut, 
  Brain, GraduationCap, Shield, Home, Calendar, 
  FileText, Sparkles, Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";

export default function Navbar({ session }: { session: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = session?.user?.isAdmin;

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md print:hidden transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group select-none">
              <div className="bg-primary p-2 rounded-xl group-hover:bg-accent transition-colors shadow-xs">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-primary leading-none">
                  Deka Search
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  คำพิพากษา & ข้อสอบ
                </span>
              </div>
            </Link>

            {/* Desktop Navigation (Visible on xl / large screens) */}
            <nav className="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-600">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive("/") && pathname === "/"
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                หน้าแรก
              </Link>
              <Link
                href="/search?tab=law"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  pathname === "/search"
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                แยกตามกฎหมาย
              </Link>
              <Link
                href="/search?tab=year"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                แยกตามปี พ.ศ.
              </Link>
              <Link
                href="/laws"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive("/laws") && !pathname.includes("#memorize")
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>ตัวบทกฎหมาย</span>
              </Link>
              <Link
                href="/laws#memorize"
                className="px-3 py-1.5 rounded-lg text-purple-700 hover:text-purple-800 hover:bg-purple-50 font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Brain className="w-4 h-4 text-purple-600" />
                <span>ท่องสอบ</span>
              </Link>
              <Link
                href="/exams"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 font-semibold ${
                  isActive("/exams")
                    ? "text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/60 shadow-2xs"
                    : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>ฝึกทำข้อสอบ</span>
              </Link>
              <Link
                href="/bookmarks"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive("/bookmarks")
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>บุ๊กมาร์ก</span>
              </Link>
              <Link
                href="/settings"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive("/settings")
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>ตั้งค่า</span>
              </Link>
            </nav>

            {/* Laptop / iPad Landscape Compact Nav (Visible on lg to xl) */}
            <nav className="hidden lg:flex xl:hidden items-center gap-1 text-sm font-medium text-slate-600">
              <Link
                href="/"
                className="px-2.5 py-1.5 rounded-lg hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                หน้าแรก
              </Link>
              <Link
                href="/laws"
                className="px-2.5 py-1.5 rounded-lg hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>ตัวบท</span>
              </Link>
              <Link
                href="/laws#memorize"
                className="px-2.5 py-1.5 rounded-lg text-purple-700 hover:bg-purple-50 font-semibold transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <Brain className="w-4 h-4 text-purple-600" />
                <span>ท่องสอบ</span>
              </Link>
              <Link
                href="/exams"
                className="px-2.5 py-1.5 rounded-lg text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-semibold transition-colors whitespace-nowrap flex items-center gap-1 border border-indigo-200/50"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>ข้อสอบ</span>
              </Link>
              <Link
                href="/bookmarks"
                className="px-2.5 py-1.5 rounded-lg hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>บุ๊กมาร์ก</span>
              </Link>
              <Link
                href="/settings"
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  isActive("/settings")
                    ? "text-primary font-bold bg-primary/5"
                    : "hover:text-primary hover:bg-slate-50"
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>ตั้งค่า</span>
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Session Avatar / Sign In */}
            <div className="hidden sm:flex items-center gap-2">
              {session ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-1 pr-2.5 rounded-full border border-slate-200 transition-colors">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="User"
                        className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                      />
                    ) : (
                      <UserCircle className="w-6 h-6 text-slate-400" />
                    )}
                    <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
                      {session.user.name?.split(" ")[0] || "ผู้ใช้"}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn("google")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl border border-primary/20 transition-colors whitespace-nowrap"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              )}
            </div>

            {/* Mobile / Tablet Menu Button (Visible under xl) */}
            <button
              className="xl:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="เปิดเมนูหลัก"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Slide-over Drawer for Mobile, Tablets & iPads */}
      {isMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-lg text-white">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-lg text-primary tracking-tight">
                  Deka Search
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Group 1: สืบค้นฎีกา */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                  ระบบสืบค้นฎีกา
                </div>
                <div className="space-y-1">
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    <Home size={18} className="text-slate-400" />
                    <span>หน้าแรกสืบค้น</span>
                  </Link>
                  <Link
                    href="/search?tab=law"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    <Scale size={18} className="text-slate-400" />
                    <span>ค้นหาแยกตามกฎหมาย</span>
                  </Link>
                  <Link
                    href="/search?tab=year"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    <Calendar size={18} className="text-slate-400" />
                    <span>ค้นหาแยกตามปี พ.ศ.</span>
                  </Link>
                  <Link
                    href="/bookmarks"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    <Bookmark size={18} className="text-amber-500" />
                    <span>คำพิพากษาที่บุ๊กมาร์กไว้</span>
                  </Link>
                </div>
              </div>

              {/* Group 2: เรียนรู้ & สอบกฎหมาย */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-2 px-2 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>เรียนรู้ & ฝึกทำข้อสอบ</span>
                </div>
                <div className="space-y-1.5">
                  <Link
                    href="/laws"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    <BookOpen size={18} className="text-blue-500" />
                    <div>
                      <div className="font-semibold text-slate-800">ตัวบทกฎหมาย</div>
                      <div className="text-xs text-slate-400">ค้นหาและอ่านตัวบททุกมาตรา</div>
                    </div>
                  </Link>

                  <Link
                    href="/laws#memorize"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-purple-50/80 border border-purple-100 text-purple-900 font-semibold text-sm hover:bg-purple-100 transition-colors"
                  >
                    <Brain size={18} className="text-purple-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold">โหมดท่องสอบ (Flashcards)</div>
                      <div className="text-xs text-purple-600 font-normal">ทบทวนความจำแบบ Spaced Repetition</div>
                    </div>
                  </Link>

                  <Link
                    href="/exams"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 font-semibold text-sm hover:bg-indigo-100 transition-colors"
                  >
                    <GraduationCap size={18} className="text-indigo-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold">ฝึกทำข้อสอบอัตนัย</div>
                      <div className="text-xs text-indigo-600 font-normal">ข้อสอบเนติฯ พร้อมตรวจประเด็นและอ่านฎีกา</div>
                    </div>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-50 font-medium text-sm transition-colors border border-slate-100"
                  >
                    <Settings size={18} className="text-slate-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">การตั้งค่าระบบ</div>
                      <div className="text-xs text-slate-400">ขนาดฟอนต์ โหมดมืด สำรองข้อมูล</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Group 3: แอดมิน (Admin Only) */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-2 px-2 flex items-center gap-1.5">
                    <Shield size={13} className="text-amber-500" />
                    <span>เมนูผู้ดูแลระบบ</span>
                  </div>
                  <Link
                    href="/settings?tab=admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-900 font-semibold text-xs hover:bg-amber-100 transition-colors"
                  >
                    <Shield size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold">จัดการระบบ & นำเข้าข้อมูล</div>
                      <div className="text-[11px] text-amber-700 font-normal">นำเข้าฎีกา, ตัวบท, ข้อสอบ และซ่อมแซมข้อมูล</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              {session ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="User"
                        className="w-10 h-10 rounded-full border border-slate-300 object-cover"
                      />
                    ) : (
                      <UserCircle className="w-10 h-10 text-slate-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {session.user.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {session.user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { signOut(); setIsMenuOpen(false); }}
                    className="w-full py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={15} />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { signIn("google"); setIsMenuOpen(false); }}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <UserCircle size={18} />
                  <span>เข้าสู่ระบบด้วย Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
