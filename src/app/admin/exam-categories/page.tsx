"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Lock, AlertCircle, Check } from 'lucide-react';

interface CategoryRow {
  id?: string;
  name: string;
  builtin: boolean;
  questionCount?: number;
}

export default function ExamCategoriesAdminPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
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
  }, [load]);

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
    </div>
  );
}
