"use client";

import { useEffect, useState } from "react";
import { Type, Minus, Plus } from "lucide-react";

export default function FontSizeController() {
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    const saved = localStorage.getItem("preferred-font-size");
    if (saved) {
      const size = parseInt(saved, 10);
      if (!isNaN(size)) {
        setFontSize(size);
        document.documentElement.style.setProperty("--content-font-size", `${size}px`);
      }
    }
  }, []);

  const changeSize = (delta: number) => {
    setFontSize((prev) => {
      const newSize = Math.max(12, Math.min(32, prev + delta));
      localStorage.setItem("preferred-font-size", newSize.toString());
      document.documentElement.style.setProperty("--content-font-size", `${newSize}px`);
      return newSize;
    });
  };

  const resetSize = () => {
    setFontSize(16);
    localStorage.setItem("preferred-font-size", "16");
    document.documentElement.style.setProperty("--content-font-size", "16px");
  };

  // Ensure it doesn't render until mounted to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse"></div>;

  return (
    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden h-9 shrink-0">
      <button 
        onClick={() => changeSize(-2)} 
        className="px-2.5 h-full hover:bg-slate-50 text-slate-600 border-r border-slate-200 flex items-center justify-center transition-colors"
        title="ลดขนาดตัวอักษร"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={resetSize}
        className="px-3 h-full hover:bg-slate-50 text-slate-600 border-r border-slate-200 flex items-center gap-1.5 transition-colors font-medium text-sm"
        title="ขนาดตัวอักษรเริ่มต้น"
      >
        <Type className="w-4 h-4" />
        <span className="min-w-[20px] text-center">{fontSize}</span>
      </button>
      <button 
        onClick={() => changeSize(2)} 
        className="px-2.5 h-full hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
        title="เพิ่มขนาดตัวอักษร"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
