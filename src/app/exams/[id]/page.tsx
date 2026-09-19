"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Clock, Play, Pause, RotateCcw, CheckCircle2, 
  AlertCircle, Scale, BookOpen, ChevronRight, X, ExternalLink, 
  Sparkles, CheckSquare, Square, Eye, FileText, Check, Save
} from 'lucide-react';
import { 
  saveExamAttempt, 
  getExamAttempts, 
  getReviewItems, 
  ExamAttempt, 
  ExamReviewItem 
} from '@/services/examService';

export default function ExamRoomPage() {
  const params = useParams();
  const id = params?.id as string;

  const [question, setQuestion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Answer state
  const [userDraft, setUserDraft] = useState('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [checkedIssues, setCheckedIssues] = useState<Record<number, boolean>>({});

  // SRS and Attempts state
  const [pastAttempts, setPastAttempts] = useState<ExamAttempt[]>([]);
  const [currentReviewItem, setCurrentReviewItem] = useState<ExamReviewItem | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Timer state (in seconds)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Side Drawer for Deka viewing
  const [activeDeka, setActiveDeka] = useState<any | null>(null);

  // Load Exam Question
  useEffect(() => {
    if (!id) return;
    const loadExam = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/exams/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถโหลดข้อสอบได้');
        }
        setQuestion(data.question);

        // Load saved draft from localStorage if any
        if (typeof window !== 'undefined') {
          const savedDraft = localStorage.getItem(`deka_exam_draft_${id}`);
          if (savedDraft) setUserDraft(savedDraft);
          const savedRevealed = localStorage.getItem(`deka_exam_revealed_${id}`);
          if (savedRevealed === 'true') setIsAnswerRevealed(true);
          const savedIssues = localStorage.getItem(`deka_exam_issues_${id}`);
          if (savedIssues) setCheckedIssues(JSON.parse(savedIssues));

          // Load past attempts & SRS status
          const attempts = getExamAttempts(id);
          setPastAttempts(attempts);
          const reviews = getReviewItems();
          const foundRev = reviews.find(r => r.questionId === id);
          if (foundRev) setCurrentReviewItem(foundRev);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อสอบ');
      } finally {
        setIsLoading(false);
      }
    };
    loadExam();
  }, [id]);

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDraftChange = (text: string) => {
    setUserDraft(text);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`deka_exam_draft_${id}`, text);
    }
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    setIsTimerRunning(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`deka_exam_revealed_${id}`, 'true');
    }
  };

  const toggleIssue = (idx: number) => {
    const updated = { ...checkedIssues, [idx]: !checkedIssues[idx] };
    setCheckedIssues(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`deka_exam_issues_${id}`, JSON.stringify(updated));
    }
  };

  const handleSaveEvaluation = () => {
    if (!question) return;
    saveExamAttempt({
      questionId: id,
      questionNumber: question.questionNumber,
      questionTitle: question.title,
      category: question.category,
      userDraft,
      timeSpentSeconds: timerSeconds,
      checkedIssues,
      totalIssuesCount,
      checkedCount,
      scorePercent,
    });

    const updatedAttempts = getExamAttempts(id);
    setPastAttempts(updatedAttempts);
    const reviews = getReviewItems();
    const foundRev = reviews.find(r => r.questionId === id);
    if (foundRev) setCurrentReviewItem(foundRev);

    setSavedSuccessMessage(
      scorePercent >= 80
        ? `บันทึกการประเมินแล้ว! คุณจับประเด็นได้ยอดเยี่ยม (${scorePercent}%) เลื่อนระดับสู่ Box ${foundRev?.srsBox || 2}`
        : `บันทึกการประเมินแล้ว! ตกประเด็นสำคัญ (${scorePercent}%) ระบบส่งเข้าคลังทบทวน (นัดหมายทำซ้ำพรุ่งนี้)`
    );
    setTimeout(() => setSavedSuccessMessage(null), 5000);
  };

  const handleResetExam = () => {
    if (window.confirm('คุณต้องการรีเซ็ตคำตอบและเริ่มทำข้อนี้ใหม่หรือไม่?')) {
      setUserDraft('');
      setIsAnswerRevealed(false);
      setCheckedIssues({});
      setTimerSeconds(0);
      setIsTimerRunning(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`deka_exam_draft_${id}`);
        localStorage.removeItem(`deka_exam_revealed_${id}`);
        localStorage.removeItem(`deka_exam_issues_${id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-medium text-slate-600">กำลังเปิดห้องสอบ...</p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
          <AlertCircle size={24} className="mx-auto mb-2 text-rose-500" />
          <p className="font-semibold text-sm">{error || 'ไม่พบข้อสอบที่ต้องการ'}</p>
        </div>
        <Link 
          href="/exams" 
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>กลับไปคลังข้อสอบ</span>
        </Link>
      </div>
    );
  }

  const checkedCount = Object.values(checkedIssues).filter(Boolean).length;
  const totalIssuesCount = question.keyIssues?.length || 0;
  const scorePercent = totalIssuesCount > 0 ? Math.round((checkedCount / totalIssuesCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Sticky Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/exams" 
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="กลับไปคลังข้อสอบ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-xs">
                  ข้อ {question.questionNumber}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {question.category}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 max-w-md">
                {question.title || `ข้อสอบข้อ ${question.questionNumber}`}
              </h1>
            </div>
          </div>

          {/* Timer Controller */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 font-mono text-sm font-bold">
              <Clock size={15} className={isTimerRunning ? 'text-indigo-600 animate-pulse' : 'text-slate-400'} />
              <span>{formatTimer(timerSeconds)}</span>
            </div>

            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isTimerRunning 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={isTimerRunning ? 'หยุดเวลาชั่วคราว' : 'เริ่มจับเวลา'}
            >
              {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={handleResetExam}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="เริ่มทำข้อนี้ใหม่"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Case Facts & Prompt (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-7 shadow-xs space-y-5 sticky top-20">
              
              {/* Question Meta Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    โจทย์ข้อสอบอัตนัย
                  </span>
                  {question.examYear && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      พ.ศ. {question.examYear}
                    </span>
                  )}
                  {currentReviewItem && (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      currentReviewItem.srsBox >= 5 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      <span>Box {currentReviewItem.srsBox}</span>
                      <span className="font-normal opacity-85">
                        {currentReviewItem.srsBox >= 5 ? '• แม่นยำแล้ว' : `• นัดทบทวน ${currentReviewItem.nextReviewDate}`}
                      </span>
                    </span>
                  )}
                </div>

                {question.examDate && (
                  <span className="text-xs text-slate-500 font-medium">
                    {question.examDate}
                  </span>
                )}
              </div>

              {/* Facts (ข้อเท็จจริง) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-500" />
                  <span>ข้อเท็จจริง (Case Facts)</span>
                </div>
                <div className="text-sm md:text-base text-slate-800 leading-relaxed font-thai bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-justify">
                  {question.facts}
                </div>
              </div>

              {/* Prompt (คำถามวินิจฉัย) */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-500/5 border-2 border-amber-300 rounded-2xl p-4 md:p-5 shadow-xs">
                <div className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>🎯 ประเด็นที่ให้วินิจฉัย:</span>
                </div>
                <div className="text-sm md:text-base font-semibold text-amber-950 leading-snug">
                  {question.prompt}
                </div>
              </div>

              {/* Citations Preview on Left Panel */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-400">มาตราและฎีกาที่เกี่ยวข้องในข้อนี้:</div>
                <div className="flex flex-wrap gap-1.5">
                  {question.relatedSections?.map((s: any, idx: number) => (
                    <span key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium flex items-center gap-1">
                      <BookOpen size={12} />
                      <span>{s.law ? `${s.law} ` : ''}ม.{s.section}</span>
                    </span>
                  ))}

                  {question.dekaDetails?.map((d: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDeka(d)}
                      className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Scale size={12} />
                      <span>ฎีกา {d.number}</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Draft Answer Pad & Answer Reveal (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. Answer Writing Pad */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-sm md:text-base font-bold text-slate-800">
                    กระดาษร่างคำตอบ (Your Answer Draft)
                  </h2>
                </div>
                <span className="text-xs text-slate-400">บันทึกอัตโนมัติ</span>
              </div>

              <textarea
                rows={10}
                value={userDraft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder="เขียนร่างคำตอบของคุณที่นี่ (วางหลักกฎหมาย → ปรับใช้กับข้อเท็จจริง → สรุปผล)..."
                className="w-full p-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed resize-y font-thai"
              />

              {/* Reveal Answer Button */}
              {!isAnswerRevealed ? (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-400">
                    เมื่อเขียนร่างเสร็จแล้ว กดปุ่มเพื่อเปิดดูธงคำตอบและประเมินประเด็น
                  </span>
                  <button
                    onClick={handleRevealAnswer}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98 flex-shrink-0"
                  >
                    <Eye size={16} />
                    <span>ดูธงคำตอบ & ตรวจประเด็น</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 size={16} />
                    <span>เปิดดูธงคำตอบแล้ว (ตรวจประเด็นที่ด้านล่าง)</span>
                  </span>
                  <button
                    onClick={() => setIsAnswerRevealed(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                  >
                    ซ่อนธง
                  </button>
                </div>
              )}
            </div>

            {/* 2. Official Answer & Self-Evaluation (Shown when revealed) */}
            {isAnswerRevealed && (
              <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 md:p-7 space-y-6 animate-in fade-in duration-300">
                
                {/* Self-Evaluation Header & Score */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-indigo-600" />
                      <span>ประเมินการจับประเด็น (Self-Evaluation Checklist)</span>
                    </h3>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      ติ๊กถูกในประเด็นที่คุณวินิจฉัยได้ถูกต้องในคำตอบของคุณ
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-indigo-900">
                      {checkedCount} / {totalIssuesCount} ประเด็น
                    </div>
                    <div className="text-xs font-semibold text-indigo-600">
                      สำเร็จ {scorePercent}%
                    </div>
                  </div>
                </div>

                {/* Key Issues Checklist */}
                <div className="space-y-2.5">
                  {question.keyIssues?.map((issue: string, idx: number) => {
                    const isChecked = Boolean(checkedIssues[idx]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleIssue(idx)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="pt-0.5 text-emerald-600">
                          {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div className="flex-1 text-xs md:text-sm leading-relaxed">
                          <span className="font-bold mr-1">ประเด็นที่ {idx + 1}:</span>
                          {issue}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score Gauge & Save Button */}
                <div className="space-y-3 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-600">เกณฑ์ความแม่นยำ:</span>
                    <span className={scorePercent >= 80 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {scorePercent >= 80 ? '✓ ผ่านเกณฑ์จับประเด็น (>= 80%)' : '⚠️ ตกประเด็นสำคัญ (ต่ำกว่า 80%)'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        scorePercent >= 80 ? 'bg-emerald-500' : scorePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="text-[11px] text-slate-500">
                      {currentReviewItem ? (
                        <span>สถานะปัจจุบัน: <strong>Box {currentReviewItem.srsBox}</strong> ({currentReviewItem.attemptCount} ครั้ง)</span>
                      ) : (
                        <span>ยังไม่เคยบันทึกประเมินข้อนี้</span>
                      )}
                    </div>

                    <button
                      onClick={handleSaveEvaluation}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-98"
                    >
                      <Save size={14} />
                      <span>บันทึกผลการประเมิน & จัดคิวทบทวน</span>
                    </button>
                  </div>

                  {savedSuccessMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>{savedSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* Past Attempts History Summary */}
                {pastAttempts.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <div className="font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>ประวัติการฝึกทำข้อนี้ ({pastAttempts.length} ครั้ง)</span>
                      <span className="text-slate-400 font-normal">ล่าสุด {new Date(pastAttempts[0].completedAt).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {pastAttempts.slice(0, 5).map((att, i) => (
                        <span
                          key={att.id || i}
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                            att.scorePercent >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          ครั้งที่ {pastAttempts.length - i}: {att.scorePercent}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Official Answer Box */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>ธงคำตอบทางการ (Official Solution)</span>
                  </div>
                  <div className="text-sm md:text-base text-slate-800 leading-relaxed font-thai bg-emerald-50/20 p-5 rounded-2xl border border-emerald-100 text-justify whitespace-pre-line">
                    {question.officialAnswer}
                  </div>
                </div>

                {/* Related Dekas Interactive Cards */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Scale size={15} className="text-emerald-600" />
                      <span>คำพิพากษาศาลฎีกาที่เกี่ยวข้องในธงคำตอบ</span>
                    </div>
                    <span className="text-xs text-slate-400">คลิกเพื่ออ่านย่อสั้น/ย่อยาว</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {question.dekaDetails?.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setActiveDeka(d)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <Scale size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-2">
                              <span>คำพิพากษาศาลฎีกาที่ {d.number}</span>
                              {d.matched && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                  ✓ มีในฐานข้อมูล
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1">
                              {d.decision?.parties ? `คู่ความ: ${d.decision.parties}` : 'คลิกเพื่ออ่านรายละเอียดคำพิพากษา'}
                            </div>
                          </div>
                        </div>

                        <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                          <span>อ่านฎีกา</span>
                          <ChevronRight size={15} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </main>

      {/* Side Drawer for Deka Reading */}
      {activeDeka && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    คำพิพากษาศาลฎีกาที่ {activeDeka.number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeDeka.decision?.decisionYear ? `ปี พ.ศ. ${activeDeka.decision.decisionYear}` : 'ข้อมูลคำพิพากษาศาลฎีกา'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeDeka.decision?.id && (
                  <Link
                    href={`/decision/${activeDeka.decision.id}`}
                    target="_blank"
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors"
                    title="เปิดหน้าฎีกาเต็มในแท็บใหม่"
                  >
                    <ExternalLink size={16} />
                  </Link>
                )}
                <button
                  onClick={() => setActiveDeka(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeDeka.decision ? (
                <>
                  {activeDeka.decision.parties && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">คู่ความ:</span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeDeka.decision.parties}</p>
                    </div>
                  )}

                  {activeDeka.decision.law && (
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">กฎหมายที่เกี่ยวข้อง:</span>
                      <p className="text-xs font-medium text-slate-700 bg-blue-50 border border-blue-100 p-2.5 rounded-lg mt-1">
                        {activeDeka.decision.law}
                      </p>
                    </div>
                  )}

                  {activeDeka.decision.shortSummary && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                        <Check size={14} className="text-emerald-600" />
                        <span>ย่อสั้น (Short Summary):</span>
                      </span>
                      <div className="text-sm text-slate-800 leading-relaxed font-thai bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 text-justify">
                        {activeDeka.decision.shortSummary}
                      </div>
                    </div>
                  )}

                  {activeDeka.decision.longSummary && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        ย่อยาว (Full Judgment Reasoning):
                      </span>
                      <div className="text-sm text-slate-800 leading-relaxed font-thai bg-white p-4 rounded-xl border border-slate-200 text-justify whitespace-pre-line">
                        {activeDeka.decision.longSummary}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <Scale className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    คำพิพากษาศาลฎีกาที่ {activeDeka.number} ยังไม่ได้ถูกนำเข้าในฐานข้อมูล 69,417 คดีของระบบ
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    ท่านสามารถสืบค้นเพิ่มเติมหรือนำเข้าไฟล์คำพิพากษาฎีกาปีนี้ผ่านหน้าแอดมินได้
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                กด Esc หรือคลิกปิดเพื่อกลับสู่การทำข้อสอบ
              </span>
              <button
                onClick={() => setActiveDeka(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
