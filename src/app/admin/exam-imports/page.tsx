"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trash2, AlertCircle, Check, FileUp } from 'lucide-react';

interface CollectionRow {
  id: string;
  title: string;
  source: string | null;
  year: number | null;
  createdAt: string;
  questionCount: number;
  categories: { category: string; count: number }[];
}

export default function ExamImportsAdminPage() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/exam-collections');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดประวัติการนำเข้าไม่สำเร็จ');
      setCollections(data.collections);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'โหลดประวัติการนำเข้าไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (c: CollectionRow) => {
    if (!window.confirm(`ลบชุด "${c.title}" ทั้งชุด (${c.questionCount} ข้อ) ?\nลบแล้วกู้คืนไม่ได้ และเลขข้อของหมวดที่เกี่ยวข้องจะถูกเรียงใหม่`)) return;
    setError(null);
    setMessage(null);
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/admin/exam-collections?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบชุดข้อสอบไม่สำเร็จ');
      setMessage(`ลบชุด "${c.title}" แล้ว (${data.deletedQuestions} ข้อ)`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ลบชุดข้อสอบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <Link href="/settings?tab=admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ChevronLeft size={16} /> กลับไปเมนูผู้ดูแลระบบ
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ประวัติการนำเข้าข้อสอบ</h1>
          <p className="text-sm text-slate-500 mt-1">
            นำเข้าผิดไฟล์หรือผิดหมวด ลบทั้งชุดได้ที่นี่ แล้วนำเข้าใหม่ — จะลบเป็นรายข้อให้เปิดข้อสอบนั้นในคลังข้อสอบ (ปุ่มสำหรับแอดมิน)
          </p>
        </div>
        <Link
          href="/admin/import-exam"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
        >
          <FileUp size={14} /> นำเข้าข้อสอบ
        </Link>
      </div>

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
        ) : collections.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">ยังไม่มีชุดข้อสอบที่นำเข้า</div>
        ) : (
          collections.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-sm font-semibold text-slate-800 break-words">{c.title}</div>
                <div className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString('th-TH')} · {c.questionCount} ข้อ
                  {c.year ? ` · พ.ศ. ${c.year}` : ''}
                  {c.source ? ` · ${c.source}` : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.categories.map((x) => (
                    <span key={x.category} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px]">
                      {x.category} · {x.count}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c)}
                disabled={deletingId === c.id}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                aria-label={`ลบชุด ${c.title}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
