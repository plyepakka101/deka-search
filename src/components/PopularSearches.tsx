import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

const POPULAR_SEARCHES = ["ละเมิด", "ฉ้อโกง", "ฟ้องหย่า", "ครอบครองปรปักษ์", "เช่าทรัพย์", "จ้างทำของ"];

export default function PopularSearches({ className = "", theme = "light" }: { className?: string, theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const labelColor = isDark ? "text-slate-300" : "text-slate-500";
  const pillClass = isDark
    ? "bg-white/10 border-white/20 text-slate-200 hover:bg-white/20 hover:text-white"
    : "bg-white border-slate-200 text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/30";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 text-sm ${className}`}>
      <span className={`${labelColor} font-medium flex items-center gap-1.5`}>
        <TrendingUp className="w-4 h-4" /> คำค้นหายอดฮิต:
      </span>
      {POPULAR_SEARCHES.map(term => (
        <Link 
          key={term} 
          href={`/search?q=${encodeURIComponent(term)}`}
          className={`px-3 py-1 border rounded-full transition-colors shadow-sm ${pillClass}`}
        >
          {term}
        </Link>
      ))}
    </div>
  );
}
