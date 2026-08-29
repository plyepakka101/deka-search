"use client";

import { Pin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserNote } from './law-mate/types';

interface PinToSectionButtonProps {
  decisionId: string;
  lawName: string;
  sectionNumber: string;
  className?: string;
}

const STORAGE_KEY = 'thai_law_mate_notes';

const lawNameToBookId: Record<string, string> = {
  "ประมวลกฎหมายอาญา": "crim",
  "ประมวลกฎหมายแพ่งและพาณิชย์": "civil",
  "ประมวลกฎหมายวิธีพิจารณาความอาญา": "crim_proc",
  "ประมวลกฎหมายวิธีพิจารณาความแพ่ง": "civil_proc",
};

export default function PinToSectionButton({ decisionId, lawName, sectionNumber, className = "" }: PinToSectionButtonProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [mounted, setMounted] = useState(false);

  const bookId = lawNameToBookId[lawName];
  const cleanSection = sectionNumber.trim().replace(/\s+/g, '').replace(/\//g, '-');
  const sectionId = bookId ? `${bookId}-${cleanSection}` : null;

  useEffect(() => {
    setMounted(true);
    if (!sectionId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const notes: Record<string, UserNote> = JSON.parse(stored);
        const note = notes[sectionId];
        if (note && note.linkedDekaIds && note.linkedDekaIds.includes(decisionId)) {
          setIsPinned(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse notes', e);
    }
  }, [sectionId, decisionId]);

  const togglePin = () => {
    if (!sectionId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const notes: Record<string, UserNote> = stored ? JSON.parse(stored) : {};
      const note = notes[sectionId] || {
        sectionId,
        text: '',
        updatedAt: Date.now(),
      };

      const currentLinks = note.linkedDekaIds || [];
      if (isPinned) {
        note.linkedDekaIds = currentLinks.filter(id => id !== decisionId);
      } else {
        note.linkedDekaIds = [...currentLinks, decisionId];
      }
      note.updatedAt = Date.now();
      notes[sectionId] = note;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setIsPinned(!isPinned);
    } catch (e) {
      console.error('Failed to save pin', e);
    }
  };

  if (!mounted || !sectionId) {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin();
      }}
      className={`transition-colors flex items-center space-x-1 px-3 py-1.5 rounded-full hover:bg-slate-100 ${
        isPinned ? 'text-law-600 bg-law-50 border border-law-200' : 'text-slate-500 border border-slate-200 hover:text-law-600'
      } ${className}`}
      aria-label={isPinned ? "Unpin from section" : "Pin to section"}
      title={isPinned ? "เอาออกจากตัวบท" : "ปักหมุดเข้าตัวบท"}
    >
      <Pin 
        className="w-4 h-4 transition-all" 
        fill={isPinned ? "currentColor" : "none"} 
      />
      <span className="text-xs font-medium">{isPinned ? 'ปักหมุดแล้ว' : 'ปักหมุดในตัวบท'}</span>
    </button>
  );
}
