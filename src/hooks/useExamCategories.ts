"use client";

import { useEffect, useState } from 'react';
import { DEFAULT_EXAM_CATEGORIES } from '@/utils/examParser';

/** โหลดรายการหมวดข้อสอบ (หมวดตั้งต้น + หมวดที่แอดมินเพิ่ม) ระหว่างโหลดใช้หมวดตั้งต้นไปก่อน */
export function useExamCategories(): string[] {
  const [categories, setCategories] = useState<string[]>([...DEFAULT_EXAM_CATEGORIES]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/exams/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.categories) return;
        setCategories(data.categories.map((c: { name: string }) => c.name));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
