"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Lock, AlertCircle, Check, ListOrdered, ArrowRight } from 'lucide-react';
import { UNCATEGORIZED_CATEGORY } from '@/utils/examParser';

interface CategoryRow {
  id?: string;
  name: string;
  builtin: boolean;
  questionCount?: number;
}

interface ReviewQuestion {
  id: string;
  questionNumber: string;
  title: string | null;
  factsPreview: string;
  prompt: string;
  examYear: number | null;
  collectionTitle: string;
}

export default function ExamCategoriesAdminPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [isRenumbering, setIsRenumbering] = useState(false);

  const loadReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exam-questions?category=${encodeURIComponent(UNCATEGORIZED_CATEGORY)}`);
      const data = await res.json();
      if (res.ok) {
        setReviewQuestions(data.questions);
        setReviewTotal(data.total);
      }
    } catch {
      /* ignore: review list is optional */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/exam-categories');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดรายการหมวดไม่สำเร็จ');
      setCategories(data.categories);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadReview();
  }, [load, loadReview]);

  const handleRenumber = async (category: string | null) => {
    setError(null);
    setMessage(null);
    const label = category ? `หมวด "${category}"` : 'ทุกหมวด';
    if (!window.confirm(`เรียงเลขข้อของ${label}ใหม่เป็น 1, 2, 3 ... ตามลำดับการนำเข้า ?`)) return;
    setIsRenumbering(true);
    try {
      const res = await fetch('/api/admin/exam-renumber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category ? { category } : { all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เรียงเลขข้อไม่สำเร็จ');
      setMessage(`เรียงเลขข้อ${label}แล้ว (เปลี่ยนเลข ${data.changed} ข้อ)`);
      await Promise.all([load(), loadReview()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRenumbering(false);
    }
  };

  const handleMove = async (q: ReviewQuestion) => {
    const target = moveTargets[q.id];
    if (!target) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/exam-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, category: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ย้ายข้อสอบไม่สำเร็จ');
      setMessage(`ย้ายข้อสอบไปหมวด "${target}" แล้ว`);
      await Promise.all([load(), loadReview()]);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteQuestion = async (q: ReviewQuestion) => {
    if (!window.confirm('ลบข้อสอบข้อนี้ถาวร ?')) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/exam-questions?id=${encodeURIComponent(q.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบข้อสอบไม่สำเร็จ');
      setMessage('ลบข้อสอบแล้ว');
      await Promise.all([load(), loadReview()]);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/exam-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เพิ่มหมวดไม่สำเร็จ');
      setName('');
      setMessage(`เพิ่มหมวด "${data.category.name}" แล้ว`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryRow) => {
    if (!cat.id) return;
    if (!window.confirm(`ลบหมวด "${cat.name}" ?`)) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/exam-categories?id=${encodeURIComponent(cat.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบหมวดไม่สำเร็จ');
      setMessage(`ลบหมวด "${cat.name}" แล้ว`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <Link href="/settings?tab=admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ChevronLeft size={16} /> กลับไปเมนูผู้ดูแลระบบ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">จัดการหมวดข้อสอบ</h1>
        <p className="text-sm text-slate-500 mt-1">
          หมวดที่เพิ่มที่นี่จะปรากฏในหน้าฝึกทำข้อสอบ จำลองสอบ และตัวเลือกตอนนำเข้าข้อสอบทันที
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="ชื่อหมวด เช่น พระราชบัญญัติจัดตั้งศาลภาษีอากร"
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={16} /> เพิ่มหมวด
        </button>
      </form>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm flex items-center gap-2">
          <Check size={16} /> {message}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">เลขข้อของข้อสอบที่นำเข้าใหม่จะต่อจากเลขสุดท้ายของแต่ละหมวดอัตโนมัติ</p>
        <button
          type="button"
          onClick={() => handleRenumber(null)}
          disabled={isRenumbering}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <ListOrdered size={14} /> เรียงเลขทุกหมวดใหม่
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-500">กำลังโหลด...</div>
        ) : (
          categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 break-words">{cat.name}</div>
                <div className="text-xs text-slate-400">{cat.questionCount ?? 0} ข้อ</div>
              </div>
              {(cat.questionCount ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => handleRenumber(cat.name)}
                  disabled={isRenumbering}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                  aria-label={`เรียงเลขข้อหมวด ${cat.name} ใหม่`}
                  title="เรียงเลขข้อใหม่เป็น 1, 2, 3 ..."
                >
                  <ListOrdered size={16} />
                </button>
              )}
              {cat.builtin ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Lock size={12} /> หมวดตั้งต้น
                </span>
              ) : cat.id ? (
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                  aria-label={`ลบหมวด ${cat.name}`}
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <span className="text-[11px] text-amber-600">มีข้อสอบเดิมในหมวดนี้</span>
              )}
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">ข้อสอบรอจัดหมวด (&quot;{UNCATEGORIZED_CATEGORY}&quot;)</h2>
          <p className="text-xs text-slate-500 mt-1">
            ข้อสอบที่ระบบตรวจไม่พบกฎหมายที่อ้างจะมาอยู่ที่นี่ เลือกหมวดที่ถูกต้องแล้วกดย้าย (ถ้ายังไม่มีหมวด ให้เพิ่มหมวดด้านบนก่อน)
          </p>
        </div>

        {reviewQuestions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
            ไม่มีข้อสอบรอจัดหมวด
          </div>
        ) : (
          <div className="space-y-3">
            {reviewTotal > reviewQuestions.length && (
              <div className="text-xs text-amber-600">แสดง {reviewQuestions.length} จาก {reviewTotal} ข้อ — จัดการชุดนี้เสร็จแล้วโหลดหน้าใหม่เพื่อดูข้อที่เหลือ</div>
            )}
            {reviewQuestions.map((q) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400">
                    ข้อ {q.questionNumber}
                    {q.collectionTitle ? ` · ${q.collectionTitle}` : ''}
                    {q.examYear ? ` · ปี ${q.examYear}` : ''}
                  </div>
                  <div className="text-sm text-slate-700 mt-1 whitespace-pre-line break-words">{q.factsPreview}</div>
                  <div className="text-xs text-indigo-700 mt-1 break-words">{q.prompt}</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={moveTargets[q.id] || ''}
                    onChange={(e) => setMoveTargets((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">เลือกหมวดที่จะย้ายไป...</option>
                    {categories
                      .filter((c) => c.name !== UNCATEGORIZED_CATEGORY)
                      .map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleMove(q)}
                    disabled={!moveTargets[q.id]}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    ย้าย <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q)}
                    className="inline-flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                    aria-label="ลบข้อสอบข้อนี้"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
