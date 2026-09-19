"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Clock, Play, Pause, AlertCircle, CheckCircle2, 
  Flag, ChevronLeft, ChevronRight, FileText, Sparkles, Send, 
  RotateCcw, BookOpen, Bot, Award, Trophy, Scale, ShieldCheck,
  CheckSquare, Square, Eye, X, HelpCircle, ExternalLink, Key
} from 'lucide-react';
import { EXAM_CATEGORIES } from '@/utils/examParser';
import { 
  saveSimulation, 
  saveExamAttempt, 
  ExamSimulation 
} from '@/services/examService';

type Phase = 'setup' | 'testing' | 'review';

export default function MockExamSimulationPage() {
  const router = useRouter();

  // Phase state
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup Config
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [unlimitedTime, setUnlimitedTime] = useState<boolean>(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Active Test State
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [userDrafts, setUserDrafts] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  
  // Timers
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(0); // in seconds
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);

  // Review / Scoring State
  const [checkedIssues, setCheckedIssues] = useState<Record<number, Record<number, boolean>>>({});
  const [aiEvaluations, setAiEvaluations] = useState<Record<number, any>>({});
  const [evaluatingAiIdx, setEvaluatingAiIdx] = useState<number | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [savedSimulationId, setSavedSimulationId] = useState<string | null>(null);

  // Load API key on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('deka_gemini_api_key');
      if (stored) {
        setGeminiApiKey(stored);
        setApiKeyInput(stored);
      }
    }
  }, []);

  // Timer interval for testing phase
  useEffect(() => {
    if (phase !== 'testing' || isTimerPaused) return;

    const interval = setInterval(() => {
      setTotalTimeSpent(prev => prev + 1);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [activeQuestionIdx]: (prev[activeQuestionIdx] || 0) + 1
      }));

      if (!unlimitedTime) {
        setTotalTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmitOnTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isTimerPaused, activeQuestionIdx, unlimitedTime]);

  const handleStartSimulation = async () => {
    setIsLoadingQuestions(true);
    setSetupError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '50');

      const res = await fetch(`/api/exams?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.questions) {
        throw new Error(data.error || 'ไม่สามารถดึงข้อมูลข้อสอบได้');
      }

      if (data.questions.length === 0) {
        throw new Error('ไม่พบข้อสอบในหมวดวิชานี้ กรุณาเลือกหมวดวิชาอื่น');
      }

      // Shuffle and pick N questions
      const shuffled = [...data.questions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

      setQuestions(selected);
      setActiveQuestionIdx(0);
      setUserDrafts({});
      setFlaggedQuestions({});
      setQuestionTimeSpent({});
      setTotalTimeSpent(0);

      // 24 minutes per question
      const totalSeconds = selected.length * 24 * 60;
      setTotalTimeRemaining(totalSeconds);

      setPhase('testing');
    } catch (err: any) {
      console.error(err);
      setSetupError(err.message || 'เกิดข้อผิดพลาดในการเริ่มจำลองการสอบ');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAutoSubmitOnTimeOut = () => {
    alert('หมดเวลาสอบแล้ว! ระบบกำลังบันทึกและส่งกระดาษคำตอบของคุณเข้าสู่ขั้นตอนตรวจคะแนน');
    finishExam();
  };

  const handleDraftChange = (text: string) => {
    setUserDrafts(prev => ({ ...prev, [activeQuestionIdx]: text }));
  };

  const toggleFlag = (idx: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const finishExam = () => {
    setIsSubmitModalOpen(false);
    setPhase('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle checklist issue in review phase
  const toggleIssueCheck = (qIdx: number, issueIdx: number) => {
    setCheckedIssues(prev => {
      const qChecks = prev[qIdx] || {};
      return {
        ...prev,
        [qIdx]: {
          ...qChecks,
          [issueIdx]: !qChecks[issueIdx]
        }
      };
    });
  };

  // Calculate score for a single question
  const getQuestionScore = (qIdx: number) => {
    const q = questions[qIdx];
    if (!q || !q.keyIssues || q.keyIssues.length === 0) return 0;
    const qChecks = checkedIssues[qIdx] || {};
    const checked = Object.values(qChecks).filter(Boolean).length;
    return Math.round((checked / q.keyIssues.length) * 100);
  };

  // Calculate overall simulation score
  const getOverallScore = () => {
    if (questions.length === 0) return 0;
    const totalScore = questions.reduce((acc, _, idx) => acc + getQuestionScore(idx), 0);
    return Math.round(totalScore / questions.length);
  };

  // AI Evaluation per question
  const handleEvaluateQuestionWithAI = async (qIdx: number) => {
    const q = questions[qIdx];
    const draft = userDrafts[qIdx] || '';
    if (!draft || draft.trim().length < 15) {
      alert('กระดาษคำตอบของข้อนี้ว่างเปล่าหรือสั้นเกินไป กรุณามีเนื้อหาคำตอบเพื่อให้ AI ประเมิน');
      return;
    }

    setEvaluatingAiIdx(qIdx);
    try {
      const res = await fetch('/api/ai/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          userDraft: draft,
          apiKey: geminiApiKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error && (data.error.includes('API Key') || data.error.includes('GEMINI_API_KEY'))) {
          setIsApiKeyModalOpen(true);
        }
        throw new Error(data.error || 'ไม่สามารถวิเคราะห์ด้วย AI ได้');
      }

      setAiEvaluations(prev => ({ ...prev, [qIdx]: data.evaluation }));
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการประเมินด้วย AI');
    } finally {
      setEvaluatingAiIdx(null);
    }
  };

  // Save full simulation to storage
  const handleSaveSimulationResult = () => {
    const overallScore = getOverallScore();
    const simData: Omit<ExamSimulation, 'id' | 'completedAt'> = {
      title: `การสอบจำลอง ${selectedCategory === 'all' ? 'รวมทุกหมวดวิชา' : selectedCategory} (${questions.length} ข้อ)`,
      category: selectedCategory,
      totalQuestions: questions.length,
      timeLimitMinutes: unlimitedTime ? 0 : questions.length * 24,
      timeSpentSeconds: totalTimeSpent,
      overallScorePercent: overallScore,
      strictMode,
      questions: questions.map((q, idx) => {
        const score = getQuestionScore(idx);
        const qChecks = checkedIssues[idx] || {};
        const totalIssuesCount = q.keyIssues?.length || 0;
        const checkedCount = Object.values(qChecks).filter(Boolean).length;
        return {
          questionId: q.id,
          questionNumber: q.questionNumber,
          questionTitle: q.title,
          category: q.category,
          facts: q.facts,
          prompt: q.prompt,
          officialAnswer: q.officialAnswer,
          keyIssues: q.keyIssues || [],
          relatedSections: q.relatedSections || [],
          userDraft: userDrafts[idx] || '',
          scorePercent: score,
          checkedIssues: qChecks,
          totalIssuesCount,
          checkedCount,
          flagged: Boolean(flaggedQuestions[idx]),
          aiEvaluation: aiEvaluations[idx]
        };
      })
    };

    const saved = saveSimulation(simData);
    setSavedSimulationId(saved.id);

    // Also record individual exam attempts to populate weakness analytics
    questions.forEach((q, idx) => {
      const qChecks = checkedIssues[idx] || {};
      const score = getQuestionScore(idx);
      const totalIssues = q.keyIssues?.length || 0;
      const checkedCount = Object.values(qChecks).filter(Boolean).length;

      saveExamAttempt({
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionTitle: q.title,
        category: q.category,
        userDraft: userDrafts[idx] || '',
        timeSpentSeconds: questionTimeSpent[idx] || Math.round(totalTimeSpent / questions.length),
        checkedIssues: qChecks,
        totalIssuesCount: totalIssues,
        checkedCount,
        scorePercent: score,
        relatedSections: q.relatedSections
      });
    });

    alert('บันทึกผลการสอบจำลองและอัปเดตสถิติจุดอ่อนเรียบร้อยแล้ว!');
  };

  const currentQ = questions[activeQuestionIdx];
  const currentDraft = userDrafts[activeQuestionIdx] || '';
  const answeredCount = Object.values(userDrafts).filter(d => d && d.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* ========================================================= */}
      {/* 1. SETUP PHASE */}
      {/* ========================================================= */}
      {phase === 'setup' && (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/exams"
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-1">
                <Trophy size={13} />
                <span>จำลองห้องสอบอัตนัยมาตรฐาน</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Mock Exam Simulator
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                กำหนดกติกา จำนวนข้อ และเวลาสอบ เพื่อฝึกความเร็วและการจับประเด็นเหมือนอยู่ในสนามสอบจริง
              </p>
            </div>
          </div>

          {setupError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-7">
            
            {/* 1. Category Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold">1</span>
                <span>เลือกหมวดวิชาที่ต้องการสอบ:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold">ทุกหมวดวิชา (คละข้อสอบ)</div>
                  <div className={`text-[11px] mt-0.5 ${selectedCategory === 'all' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    สุ่มรวมทุกสายวิชา
                  </div>
                </button>

                {EXAM_CATEGORIES.map((catName) => (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setSelectedCategory(catName)}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                      selectedCategory === catName
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold line-clamp-1">{catName}</div>
                    <div className={`text-[11px] mt-0.5 ${selectedCategory === catName ? 'text-indigo-200' : 'text-slate-400'}`}>
                      เน้นเจาะจงวิชานี้
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Number of Questions */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold">2</span>
                <span>จำนวนข้อสอบ:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { count: 3, label: '3 ข้อ (จับเวลาเร่งรัด)', time: '1 ชม. 12 นาที', desc: 'เหมาะสำหรับทบทวนเร็วประจำวัน' },
                  { count: 5, label: '5 ข้อ (ครึ่งฉบับ)', time: '2 ชม. 00 นาที', desc: 'ซ้อมทำข้อสอบช่วงบ่าย' },
                  { count: 10, label: '10 ข้อ (ฉบับเต็มเนติฯ)', time: '4 ชม. 00 นาที', desc: 'มาตรฐานการสอบจริงเต็มรูปแบบ' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setQuestionCount(item.count)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      questionCount === item.count
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">{item.label}</div>
                    <div className="text-xs font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
                      <Clock size={12} />
                      <span>เวลามาตรฐาน: {item.time}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Time Mode & Strict Exam Rules */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold">3</span>
                <span>กฎและสภาพแวดล้อมห้องสอบ (Exam Rules):</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Strict Mode Toggle */}
                <div 
                  onClick={() => setStrictMode(!strictMode)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    strictMode 
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="pt-0.5 text-emerald-600">
                    {strictMode ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Strict Mode (เสมือนจริง 100%)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ซ่อนคำใบ้และมาตราที่เกี่ยวข้องทั้งหมดระหว่างทำ และเปิดดูธงคำตอบได้เมื่อส่งกระดาษคำตอบครบแล้วเท่านั้น
                    </p>
                  </div>
                </div>

                {/* Unlimited Time Toggle */}
                <div 
                  onClick={() => setUnlimitedTime(!unlimitedTime)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    unlimitedTime 
                      ? 'bg-amber-50/60 border-amber-300 text-amber-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="pt-0.5 text-amber-600">
                    {unlimitedTime ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      <span>โหมดไม่จำกัดเวลา (Practice Mode)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      จับเวลาเดินหน้าโดยไม่ตัดเวลาสอบอัตโนมัติ เหมาะสำหรับผู้เริ่มต้นฝึกคิดวิเคราะห์
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch CTA Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div className="text-xs text-slate-500 font-medium">
                ⏱️ เกณฑ์เวลามาตรฐานเนติบัณฑิต: <strong>24 นาทีต่อข้อ</strong> ({questionCount * 24} นาที รวม)
              </div>

              <button
                onClick={handleStartSimulation}
                disabled={isLoadingQuestions}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isLoadingQuestions ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังเตรียมชุดข้อสอบ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>เข้าสู่ห้องสอบจำลอง ({questionCount} ข้อ)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ACTIVE TESTING PHASE */}
      {/* ========================================================= */}
      {phase === 'testing' && currentQ && (
        <div>
          {/* Top Sticky Test Room Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              
              {/* Left: Question Title & Indicator */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (window.confirm('คุณต้องการยกเลิกการสอบจำลองรอบนี้และกลับสู่หน้าหลักหรือไม่?')) {
                      setPhase('setup');
                    }
                  }}
                  className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                  title="ออกจากห้องสอบ"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-extrabold text-xs">
                    ข้อที่ {activeQuestionIdx + 1} / {questions.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium hidden md:inline">
                    {currentQ.category}
                  </span>
                </div>
              </div>

              {/* Center: Countdown Timer */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-bold transition-all ${
                  unlimitedTime 
                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                    : totalTimeRemaining < 600
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : totalTimeRemaining < 1800
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  <Clock size={16} />
                  <span>
                    {unlimitedTime ? formatTime(totalTimeSpent) : formatTime(totalTimeRemaining)}
                  </span>
                  {!unlimitedTime && (
                    <span className="text-[10px] uppercase tracking-wider font-sans font-semibold opacity-75 hidden sm:inline">
                      เหลือเวลา
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                  title={isTimerPaused ? 'เริ่มเวลาต่อ' : 'หยุดเวลาชั่วคราว'}
                >
                  {isTimerPaused ? <Play size={16} className="text-emerald-600" /> : <Pause size={16} />}
                </button>
              </div>

              {/* Right: Flag & Submit */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFlag(activeQuestionIdx)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    flaggedQuestions[activeQuestionIdx]
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-500 hover:text-slate-700 border-slate-200'
                  }`}
                  title="ปักหมุดข้อนี้เพื่อกลับมาทบทวนก่อนส่ง"
                >
                  <Flag size={14} className={flaggedQuestions[activeQuestionIdx] ? 'fill-amber-500 text-amber-500' : ''} />
                  <span className="hidden sm:inline">
                    {flaggedQuestions[activeQuestionIdx] ? 'ปักหมุดแล้ว' : 'ปักหมุด'}
                  </span>
                </button>

                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Send size={14} />
                  <span>ส่งกระดาษคำตอบ</span>
                </button>
              </div>

            </div>

            {/* Question Navigator Ribbon */}
            <div className="max-w-7xl mx-auto px-4 py-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                {questions.map((q, idx) => {
                  const hasDraft = Boolean(userDrafts[idx] && userDrafts[idx].trim().length > 0);
                  const isFlagged = Boolean(flaggedQuestions[idx]);
                  const isActive = idx === activeQuestionIdx;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`relative min-w-[34px] h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                          : hasDraft
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`ข้อที่ ${idx + 1}${hasDraft ? ' (เขียนแล้ว)' : ''}${isFlagged ? ' (ปักหมุด)' : ''}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-medium shrink-0 hidden sm:block">
                เขียนตอบแล้ว {answeredCount} จาก {questions.length} ข้อ
              </div>
            </div>
          </header>

          {/* Test Room Body Grid */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Question Facts & Prompt (6 cols) */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-7 shadow-xs space-y-5 sticky top-28">
                  
                  {/* Meta Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        โจทย์ข้อสอบข้อที่ {activeQuestionIdx + 1}
                      </span>
                      {currentQ.examYear && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          พ.ศ. {currentQ.examYear}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <span>เวลาทำข้อนี้:</span>
                      <strong className="text-slate-800 font-mono">
                        {formatTime(questionTimeSpent[activeQuestionIdx] || 0)}
                      </strong>
                      <span className="text-slate-400">/ 24:00 น.</span>
                    </div>
                  </div>

                  {/* Facts */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-500" />
                      <span>ข้อเท็จจริง (Case Facts)</span>
                    </div>
                    <div className="text-sm md:text-base text-slate-800 leading-relaxed font-thai bg-slate-50/60 p-4 rounded-2xl border border-slate-100 text-justify">
                      {currentQ.facts}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-500/5 border-2 border-amber-300 rounded-2xl p-4 md:p-5 shadow-xs">
                    <div className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>🎯 ประเด็นที่ให้วินิจฉัย:</span>
                    </div>
                    <div className="text-sm md:text-base font-semibold text-amber-950 leading-snug">
                      {currentQ.prompt}
                    </div>
                  </div>

                  {/* Non-strict hint (if strictMode is false) */}
                  {!strictMode && currentQ.relatedSections && currentQ.relatedSections.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-400 mb-1.5">คำใบ้มาตรา (โหมดฝึกซ้อม):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentQ.relatedSections.map((s: any, idx: number) => (
                          <span key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium">
                            {s.law ? `${s.law} ` : ''}ม.{s.section}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Digital Answer Sheet (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <h2 className="text-sm md:text-base font-bold text-slate-800">
                        กระดาษคำตอบข้อที่ {activeQuestionIdx + 1}
                      </h2>
                    </div>
                    <span className="text-xs text-slate-400">
                      {currentDraft.length} ตัวอักษร
                    </span>
                  </div>

                  <textarea
                    rows={14}
                    value={currentDraft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder="เขียนตอบข้อสอบข้อนี้ตามลำดับ (1. วางหลักกฎหมาย → 2. ปรับบทข้อเท็จจริง → 3. สรุปผลฟันธง)..."
                    className="w-full p-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed resize-y font-thai"
                  />

                  {/* Navigator Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveQuestionIdx(Math.max(0, activeQuestionIdx - 1))}
                      disabled={activeQuestionIdx === 0}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft size={16} />
                      <span>ข้อก่อนหน้า</span>
                    </button>

                    {activeQuestionIdx < questions.length - 1 ? (
                      <button
                        onClick={() => setActiveQuestionIdx(activeQuestionIdx + 1)}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <span>ข้อถัดไป</span>
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <span>ตรวจทาน & ส่งข้อสอบ</span>
                        <Send size={14} />
                      </button>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </main>

          {/* Submit Confirmation Modal */}
          {isSubmitModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                    <Send size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    ยืนยันการส่งกระดาษคำตอบ
                  </h3>
                  <p className="text-xs text-slate-500">
                    คุณได้เขียนคำตอบแล้ว <strong>{answeredCount}</strong> จาก <strong>{questions.length}</strong> ข้อ
                  </p>
                </div>

                {answeredCount < questions.length && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <span>ยังมีอีก {questions.length - answeredCount} ข้อที่คุณยังไม่ได้เขียนคำตอบ</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    กลับไปทำต่อ
                  </button>
                  <button
                    onClick={finishExam}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    ยืนยันส่งข้อสอบ
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. REVIEW & SCORING PHASE */}
      {/* ========================================================= */}
      {phase === 'review' && (
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 animate-in fade-in">
          
          {/* Top Score Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-10 shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
                  <CheckCircle2 size={14} />
                  <span>การสอบจำลองเสร็จสมบูรณ์</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  ผลการสอบจำลอง (Mock Exam Report)
                </h1>
                <p className="text-slate-300 text-xs md:text-sm mt-1">
                  หมวดวิชา: {selectedCategory === 'all' ? 'รวมทุกหมวดวิชา' : selectedCategory} • ใช้เวลารวม {formatTime(totalTimeSpent)}
                </p>
              </div>

              {/* Overall Score Circle/Badge */}
              <div className="text-center bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                <div className="text-3xl md:text-4xl font-black text-emerald-400">
                  {getOverallScore()}%
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-0.5">
                  คะแนนประเมินรวม
                </div>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href="/exams"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>กลับไปคลังข้อสอบ</span>
                </Link>

                <button
                  onClick={() => setPhase('setup')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>เริ่มสอบจำลองรอบใหม่</span>
                </button>
              </div>

              <button
                onClick={handleSaveSimulationResult}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Award size={15} />
                <span>{savedSimulationId ? '✓ บันทึกผลสำเร็จแล้ว' : 'บันทึกประวัติการสอบลงฐานข้อมูล'}</span>
              </button>
            </div>
          </div>

          {/* Question by Question Review Accordions */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              <span>ตรวจประเด็นและเปรียบเทียบธงคำตอบ ({questions.length} ข้อ)</span>
            </h2>

            {questions.map((q, qIdx) => {
              const score = getQuestionScore(qIdx);
              const draft = userDrafts[qIdx] || '';
              const aiEval = aiEvaluations[qIdx];

              return (
                <div key={qIdx} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-7 shadow-xs space-y-5">
                  
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-xs">
                        ข้อที่ {qIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {q.category} {q.examYear ? `(พ.ศ. ${q.examYear})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">
                        เวลาที่ใช้: {formatTime(questionTimeSpent[qIdx] || 0)}
                      </span>
                      <span className={`text-sm font-extrabold px-3 py-0.5 rounded-xl border ${
                        score >= 80 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        คะแนนประเด็น: {score}%
                      </span>
                    </div>
                  </div>

                  {/* Prompt Preview */}
                  <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-amber-800 font-bold mr-1.5">🎯 คำถาม:</span>
                    {q.prompt}
                  </div>

                  {/* User Answer vs Official Answer Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* User Answer */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                        <span>คำตอบของคุณ:</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {draft.length > 0 ? `${draft.length} ตัวอักษร` : 'ไม่ได้เขียนคำตอบ'}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs md:text-sm font-thai leading-relaxed text-slate-800 min-h-[160px] whitespace-pre-line text-justify">
                        {draft || <span className="text-slate-400 italic">ไม่ได้เขียนร่างคำตอบในข้อนี้</span>}
                      </div>
                    </div>

                    {/* Official Answer */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>ธงคำตอบทางการ:</span>
                      </div>
                      <div className="p-4 bg-emerald-50/20 rounded-2xl border border-emerald-200 text-xs md:text-sm font-thai leading-relaxed text-slate-800 min-h-[160px] whitespace-pre-line text-justify">
                        {q.officialAnswer}
                      </div>
                    </div>
                  </div>

                  {/* Issue Spotting Checklist */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" />
                        <span>ประเมินการจับประเด็น (ติ๊กถูกในประเด็นที่วินิจฉัยถูกต้อง):</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {q.keyIssues?.map((issue: string, issueIdx: number) => {
                        const isChecked = Boolean(checkedIssues[qIdx]?.[issueIdx]);
                        return (
                          <div
                            key={issueIdx}
                            onClick={() => toggleIssueCheck(qIdx, issueIdx)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="pt-0.5 text-emerald-600">
                              {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-500 font-bold mr-1">ประเด็นที่ {issueIdx + 1}:</span>
                              {issue}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Evaluation Button & Card */}
                  <div className="pt-2">
                    {!aiEval ? (
                      <button
                        onClick={() => handleEvaluateQuestionWithAI(qIdx)}
                        disabled={evaluatingAiIdx === qIdx}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {evaluatingAiIdx === qIdx ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>AI กำลังวิเคราะห์ข้อนี้...</span>
                          </>
                        ) : (
                          <>
                            <Bot size={14} />
                            <span>🤖 วิเคราะห์ข้อนี้ด้วย AI (Gemini)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                            <Bot size={16} className="text-purple-600" />
                            <span>ผลการประเมินจาก Gemini AI</span>
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-0.5 bg-purple-600 text-white rounded-lg">
                            {aiEval.overallScore} / 10 คะแนน
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <div className="p-2 bg-white rounded-xl border border-purple-100">
                            <strong>วางหลัก:</strong> {aiEval.ruleScore}/10 - {aiEval.ruleFeedback}
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-purple-100">
                            <strong>ปรับบท:</strong> {aiEval.applicationScore}/10 - {aiEval.applicationFeedback}
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-purple-100">
                            <strong>ฟันธง:</strong> {aiEval.conclusionScore}/10 - {aiEval.conclusionFeedback}
                          </div>
                        </div>

                        {aiEval.recommendedPhrasing && (
                          <div className="text-xs italic text-indigo-900 bg-white p-3 rounded-xl border border-indigo-100">
                            &ldquo;{aiEval.recommendedPhrasing}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Gemini API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    ตั้งค่า Google Gemini API Key
                  </h3>
                  <p className="text-[11px] text-slate-500">สำหรับใช้งาน AI Evaluator ในห้องสอบจำลอง</p>
                </div>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-thai">
              <p>
                รับ API Key ฟรีได้จาก Google AI Studio:
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-purple-700 hover:text-purple-900 font-bold underline inline-flex items-center gap-1"
              >
                <span>aistudio.google.com/app/apikey</span>
                <ExternalLink size={12} />
              </a>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gemini API Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  const key = apiKeyInput.trim();
                  setGeminiApiKey(key);
                  if (typeof window !== 'undefined') {
                    if (key) localStorage.setItem('deka_gemini_api_key', key);
                    else localStorage.removeItem('deka_gemini_api_key');
                  }
                  setIsApiKeyModalOpen(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                บันทึกคีย์
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
