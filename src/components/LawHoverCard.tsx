"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function LawHoverCard({ 
  bookId, 
  sectionNum, 
  matchText 
}: { 
  bookId: string, 
  sectionNum: string, 
  matchText: string 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      if (!content && !isLoading) {
        setIsLoading(true);
        fetch(`/api/laws/preview?bookId=${bookId}&s=${sectionNum}`)
          .then(res => res.json())
          .then(data => {
            if (data.content) setContent(data.content);
            else setContent("ไม่พบเนื้อหามาตรานี้");
          })
          .catch(() => setContent("เกิดข้อผิดพลาดในการโหลดเนื้อหา"))
          .finally(() => setIsLoading(false));
      }
    }, 400); // 400ms delay before showing
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link 
        href={`/laws#/${bookId}?s=${sectionNum}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium relative z-10"
      >
        {matchText}
      </Link>

      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 text-sm text-slate-700 animate-in fade-in zoom-in duration-200 cursor-default">
          <div className="font-semibold text-primary mb-2 border-b border-slate-100 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            พรีวิวมาตรา {sectionNum}
          </div>
          {isLoading ? (
            <div className="space-y-2 py-1">
              <div className="h-2 bg-slate-200 rounded animate-pulse w-full"></div>
              <div className="h-2 bg-slate-200 rounded animate-pulse w-5/6"></div>
              <div className="h-2 bg-slate-200 rounded animate-pulse w-4/6"></div>
            </div>
          ) : (
            <div className="line-clamp-6 leading-relaxed whitespace-pre-wrap">{content}</div>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
        </div>
      )}
    </span>
  );
}
