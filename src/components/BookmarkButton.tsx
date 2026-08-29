"use client";

import { useBookmarks } from '@/hooks/useBookmarks';
import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BookmarkButtonProps {
  decision: {
    id: string;
    decisionNumber: string;
    decisionYear?: number | null;
    parties?: string | null;
    shortSummary?: string | null;
  };
  className?: string;
}

export default function BookmarkButton({ decision, className = "" }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, isLoaded } = useBookmarks();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return (
      <button className={`text-slate-300 pointer-events-none ${className}`} aria-label="Loading bookmark status">
        <Bookmark className="w-5 h-5" />
      </button>
    );
  }

  const active = isBookmarked(decision.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // Prevent triggering parent links if nested
        e.stopPropagation();
        toggleBookmark(decision);
      }}
      className={`transition-colors p-2 rounded-full hover:bg-slate-100 ${
        active ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
      } ${className}`}
      aria-label={active ? "Remove bookmark" : "Add bookmark"}
      title={active ? "เอาออกจากบุ๊กมาร์ก" : "บันทึกคดีนี้"}
    >
      <Bookmark 
        className="w-5 h-5 transition-all" 
        fill={active ? "currentColor" : "none"} 
      />
    </button>
  );
}
