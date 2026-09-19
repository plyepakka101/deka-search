"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, Search, Filter, BookOpen, Scale, 
  Calendar, ChevronRight, CheckCircle2, Clock, Sparkles, AlertCircle,
  Award, Trophy, History, RotateCcw, ArrowRight
} from 'lucide-react';
import { EXAM_CATEGORIES } from '@/utils/examParser';
import { 
  getExamStatistics, 
  getDueReviewItems, 
  getExamAttempts, 
  ExamAttempt, 
  ExamReviewItem 
} from '@/services/examService';

export default function ExamsCatalogPage() {
  const [activeMainTab, setActiveMainTab] = useState<'all' | 'due' | 'history'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats & SRS State
  const [stats, setStats] = useState({
    totalAttempts: 0,
    uniqueQuestionsDone: 0,
    avgScore: 0,
    dueReviewsCount: 0,
    activeReviewsCount: 0,
    masteredCount: 0,
  });
  const [dueItems, setDueItems] = useState<ExamReviewItem[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<ExamAttempt[]>([]);

  const refreshClientData = () => {
    setStats(getExamStatistics());
    setDueItems(getDueReviewItems());
    setRecentAttempts(getExamAttempts());
  };

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedYear) params.set('year', selectedYear);

      const res = await fetch(`/api/exams?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch exams');

      setQuestions(data.questions || []);
      setCategoryStats(data.categoryStats || {});
      setTotalQuestions(data.totalAllCategories || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    refreshClientData();
  }, [selectedCategory, selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExams();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')} นาที`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-10 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Sparkles size={14} />
            <span>คลังข้อสอบอัตนัย & ระบบทบทวนอัจฉริยะ (SRS)</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            ฝึกทำข้อสอบอัตนัย เชื่อมโยงตัวบทและฎีกาจริง
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            ฝึกเขียนตอบข้อสอบเนติบัณฑิตและผู้ช่วยฯ ตรวจสอบประเด็นสำคัญ (Issue Spotting) เทียบกับธงคำตอบ พร้อมอ่านคำพิพากษาศาลฎีกาที่เกี่ยวข้องได้ทันทีในหน้าเดียว
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="text-indigo-400" size={16} />
              <span>ข้อสอบทั้งหมด {totalQuestions} ข้อ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scale className="text-emerald-400" size={16} />
              <span>เชื่อมต่อฐานข้อมูล 69,417 ฎีกา</span>
            </div>
          </div>
        </div>
      </div>

      {/* SRS Practice Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">ฝึกทำสะสม</div>
            <div className="text-lg font-bold text-slate-800">
              {stats.totalAttempts} <span className="text-xs font-normal text-slate-500">ครั้ง ({stats.uniqueQuestionsDone} ข้อ)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">คะแนนเฉลี่ย</div>
            <div className="text-lg font-bold text-emerald-700">
              {stats.avgScore}%
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveMainTab('due')}
          className={`bg-white rounded-2xl border p-4 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all ${
            stats.dueReviewsCount > 0 
              ? 'border-amber-300 hover:border-amber-400 bg-amber-50/20' 
              : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            stats.dueReviewsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">ต้องทบทวนวันนี้</div>
            <div className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <span>{stats.dueReviewsCount}</span>
              <span className="text-xs font-normal text-slate-500">ข้อ</span>
              {stats.dueReviewsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  รอทบทวน
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">แม่นยำระดับ Mastered</div>
            <div className="text-lg font-bold text-violet-700">
              {stats.masteredCount} <span className="text-xs font-normal text-slate-500">ข้อ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMainTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={16} />
          <span>คลังข้อสอบทั้งหมด</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeMainTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {totalQuestions}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('due')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'due'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock size={16} />
          <span>คิวทบทวนวันนี้ (Due Today)</span>
          {stats.dueReviewsCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeMainTab === 'due' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
            }`}>
              {stats.dueReviewsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'history'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History size={16} />
          <span>ประวัติการฝึกทำ</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeMainTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {stats.totalAttempts}
          </span>
        </button>
      </div>

      {/* TAB 1: ALL QUESTIONS */}
      {activeMainTab === 'all' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาข้อสอบ, คำสำคัญ, มาตรา (เช่น 90/12), เลขฎีกา (เช่น 5744/2531)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">ทุกปี พ.ศ.</option>
                  {[2565, 2564, 2563, 2562, 2560, 2559, 2558, 2557, 2556, 2554, 2553, 2551, 2550, 2548, 2547, 2546, 2545].map(yr => (
                    <option key={yr} value={yr}>พ.ศ. {yr}</option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  ค้นหา
                </button>
              </div>
            </form>

            {/* 9 Categories Tabs */}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Filter size={14} />
                <span>เลือกหมวดกฎหมาย:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({totalQuestions})
                </button>

                {EXAM_CATEGORIES.map((cat) => {
                  const count = categoryStats[cat] || 0;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Questions Grid / List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm">กำลังโหลดคลังข้อสอบ...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-500" />
              <p className="text-sm">{error}</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <GraduationCap size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">ยังไม่พบข้อสอบในหมวดหมู่นี้</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ท่านสามารถนำเข้าข้อสอบอัตนัยฉบับเต็มได้ที่หน้าผู้ดูแลระบบ หรือลองเลือกหมวดหมู่อื่น
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/import-exam"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>ไปที่หน้านำเข้าข้อสอบ</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>พบข้อสอบ <strong>{questions.length}</strong> ข้อ</span>
                <span>คลิกที่การ์ดเพื่อเข้าสู่ห้องสอบอัตนัย</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions.map((q) => (
                  <Link
                    key={q.id}
                    href={`/exams/${q.id}`}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg group-hover:bg-indigo-700 transition-colors">
                            ข้อ {q.questionNumber}
                          </span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {q.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                          {q.examYear && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md font-semibold">
                              พ.ศ. {q.examYear}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Facts excerpt */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {q.title || q.facts}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                          {q.facts}
                        </p>
                      </div>

                      {/* Prompt highlight */}
                      <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-2.5 text-xs text-amber-950 font-medium line-clamp-2">
                        🎯 <span className="font-semibold">{q.prompt}</span>
                      </div>
                    </div>

                    {/* Bottom metadata tags */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {q.relatedDekas?.length > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium flex items-center gap-1">
                            <Scale size={12} />
                            <span>{q.relatedDekas.length} ฎีกา</span>
                          </span>
                        )}

                        {q.relatedSections?.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium flex items-center gap-1">
                            <BookOpen size={12} />
                            <span>{q.relatedSections.length} มาตรา</span>
                          </span>
                        )}
                      </div>

                      <span className="text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        <span>ทำข้อสอบ</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DUE REVIEW QUEUE (SRS) */}
      {activeMainTab === 'due' && (
        <div className="space-y-4">
          {dueItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">ไม่มีข้อสอบที่ต้องทบทวนในวันนี้ 🎉</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  ยอดเยี่ยมมาก! คุณทบทวนครบตามกำหนดแล้ว ระบบจะจัดคิวข้อสอบตามรอบระยะเวลา (1, 3, 7, 14 วัน) เพื่อความแม่นยำระยะยาว
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveMainTab('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <BookOpen size={16} />
                  <span>เลือกทำข้อสอบใหม่จากคลัง</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>มีข้อสอบที่ถึงกำหนดทบทวน <strong>{dueItems.length}</strong> ข้อ</span>
                <span>(ระบบเว้นระยะทบทวน Spaced Repetition System)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dueItems.map((item) => (
                  <Link
                    key={item.questionId}
                    href={`/exams/${item.questionId}`}
                    className="group bg-white rounded-2xl border-2 border-amber-200 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg">
                            ข้อ {item.questionNumber}
                          </span>
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-md">
                            Box {item.srsBox}/5
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2">
                          {item.questionTitle || `ข้อสอบข้อที่ ${item.questionNumber}`}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>คะแนนครั้งก่อน: <strong className={item.lastScorePercent >= 80 ? 'text-emerald-600' : 'text-rose-600'}>{item.lastScorePercent}%</strong></span>
                          <span>•</span>
                          <span>ฝึกแล้ว: <strong>{item.attemptCount}</strong> ครั้ง</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <RotateCcw size={14} />
                        <span>เริ่มทบทวนรอบนี้</span>
                      </span>
                      <ChevronRight size={16} className="text-amber-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTEMPTS HISTORY */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          {recentAttempts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-3xl flex items-center justify-center mx-auto">
                <History size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">ยังไม่มีประวัติการฝึกทำข้อสอบ</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  เมื่อท่านเข้าไปฝึกเขียนตอบและประเมินประเด็น คะแนนและเวลาที่ใช้จะถูกบันทึกไว้ที่นี่
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveMainTab('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <BookOpen size={16} />
                  <span>เริ่มฝึกข้อสอบข้อแรก</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>ประวัติการส่งคำตอบทั้งหมด <strong>{recentAttempts.length}</strong> ครั้ง</span>
                <span>เรียงจากล่าสุดไปเก่าสุด</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {recentAttempts.map((att) => {
                  const isHigh = att.scorePercent >= 80;
                  const isMid = att.scorePercent >= 50 && att.scorePercent < 80;
                  return (
                    <div key={att.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">
                            ข้อ {att.questionNumber}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {att.category}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400">
                            {formatDate(att.completedAt)}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800">
                          {att.questionTitle || `ข้อสอบข้อที่ ${att.questionNumber}`}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>เวลาที่ใช้: {formatSeconds(att.timeSpentSeconds)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span>จับประเด็นได้: {att.checkedCount}/{att.totalIssuesCount}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        <div className={`px-3 py-1.5 rounded-xl text-center font-bold text-sm ${
                          isHigh 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isMid 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <div className="text-base leading-none">{att.scorePercent}%</div>
                          <div className="text-[10px] font-medium mt-0.5">
                            {isHigh ? 'ผ่านเกณฑ์' : isMid ? 'ปานกลาง' : 'ควรทบทวน'}
                          </div>
                        </div>

                        <Link
                          href={`/exams/${att.questionId}`}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>ทำซ้ำ</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

