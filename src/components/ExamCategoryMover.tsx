"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Shield } from 'lucide-react';
import { useExamCategories } from '@/hooks/useExamCategories';

interface ExamCategoryMoverProps {
  questionId: string;
  currentCategory: string;
  /** เรียกหลังย้ายสำเร็จ พร้อมหมวดใหม่และเลขข้อใหม่ในหมวดนั้น */
  onMoved?: (result: { category: string; questionNumber: string }) => void;
  className?: string;
}

/**
 * ย้ายข้อสอบข้อนี้ไปหมวดอื่น — แสดงเฉพาะแอดมิน (เซิร์ฟเวอร์ตรวจสิทธิ์ซ้ำที่ /api/admin/exam-questions)
 */
export default function ExamCategoryMover({
  questionId,
  currentCategory,
  onMoved,
  className = '',
}: ExamCategoryMoverProps) {
  const { data: session } = useSession();
  const categories = useExamCategories();
  const [target, setTarget] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  if (!session?.user?.isAdmin) return null;

  const handleMove = async () => {
    if (!target || target === currentCategory) return;
    setIsMoving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/exam-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: questionId, category: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ย้ายข้อสอบไม่สำเร็จ');
      setMessage({ type: 'ok', text: `ย้ายไปหมวด "${data.category}" แล้ว` });
      setTarget('');
      onMoved?.({ category: data.category, questionNumber: data.questionNumber });
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'ย้ายข้อสอบไม่สำเร็จ' });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
        <Shield size={12} /> ย้ายหมวด (แอดมิน)
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30"
        >
          <option value="">เลือกหมวดที่จะย้ายไป...</option>
          {categories
            .filter((c) => c !== currentCategory)
            .map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
        </select>
        <button
          type="button"
          onClick={handleMove}
          disabled={!target || isMoving}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
        >
          {isMoving ? 'กำลังย้าย...' : <>ย้าย <ArrowRight size={12} /></>}
        </button>
      </div>
      {message && (
        <div className={`text-[11px] ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
