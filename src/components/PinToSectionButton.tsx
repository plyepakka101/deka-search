"use client";

import { Pin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserNote } from '@/components/law-mate/types';
import { getNotes, saveNote, syncAdminImportantSections } from '@/components/law-mate/services/dataService';

interface PinToSectionButtonProps {
  decisionId: string;
  lawName: string;
  sectionNumber: string;
  className?: string;
}

const lawNameToBookId: Record<string, string> = {
  "ประมวลกฎหมายอาญา": "crim",
  "ประมวลกฎหมายแพ่งและพาณิชย์": "civil",
  "ประมวลกฎหมายวิธีพิจารณาความอาญา": "crim_proc",
  "ประมวลกฎหมายวิธีพิจารณาความแพ่ง": "civil_proc",
  "รัฐธรรมนูญแห่งราชอาณาจักรไทย": "const",
  "พระราชบัญญัติล้มละลาย": "bankruptcy",
  "พ.ร.บ. จัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง": "kwaeng",
  "พระธรรมนูญศาลยุติธรรม": "court_const",
  "พระราชบัญญัติวิธีพิจารณาคดีผู้บริโภค พ.ศ. 2551": "consumer_proc",
  "พระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537": "copyright",
  "พระราชบัญญัติศาลเยาวชนและครอบครัวและวิธีพิจารณาคดีเยาวชนและครอบครัว พ.ศ. 2553": "juvenile_court",
  "พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541": "labour_protection",
  "พระราชบัญญัติจัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง พ.ศ. 2542": "admin_court",
  "ประมวลรัษฎากร": "revenue",
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

    const checkPinStatus = () => {
      try {
        const notes = getNotes();
        const note = notes[sectionId];
        if (note && note.linkedDekaIds && note.linkedDekaIds.includes(decisionId)) {
          setIsPinned(true);
        } else {
          setIsPinned(false);
        }
      } catch (e) {
        console.error('Failed to parse notes', e);
      }
    };

    checkPinStatus();

    // Background sync with server if admin
    syncAdminImportantSections().then(checkPinStatus).catch(() => {});

    window.addEventListener('laws-notes-updated', checkPinStatus);
    return () => {
      window.removeEventListener('laws-notes-updated', checkPinStatus);
    };
  }, [sectionId, decisionId]);

  const togglePin = () => {
    if (!sectionId) return;

    try {
      const notes = getNotes();
      const note: UserNote = notes[sectionId] || {
        sectionId,
        text: '',
        updatedAt: Date.now(),
      };

      const currentLinks = note.linkedDekaIds || [];
      const willPin = !isPinned;

      if (!willPin) {
        note.linkedDekaIds = currentLinks.filter(id => id !== decisionId);
      } else {
        note.linkedDekaIds = Array.from(new Set([...currentLinks, decisionId]));
      }
      note.updatedAt = Date.now();

      // 0ms instant UI update
      setIsPinned(willPin);

      // Save locally and sync to database in background
      saveNote(note, {
        bookId: bookId || undefined,
        sectionNumber: cleanSection,
        title: `มาตรา ${cleanSection}`
      });
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
        isPinned ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800' : 'text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-amber-600'
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
