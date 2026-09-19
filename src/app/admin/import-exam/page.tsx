"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Upload, FileText, ChevronLeft, Check, AlertCircle, 
  Sparkles, BookOpen, Scale, Calendar, Eye, Save, Trash2, ArrowRight
} from 'lucide-react';
import { EXAM_CATEGORIES } from '@/utils/examParser';

export default function ImportExamPage() {
  const [category, setCategory] = useState<string>(EXAM_CATEGORIES[5]); // Default: พ.ร.บ.ล้มละลาย
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('เนติบัณฑิตยสภา');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');

  // States for Preview & Save
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewCollection, setPreviewCollection] = useState<any | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setError('กรุณาวางข้อความข้อสอบ หรือเลือกไฟล์ข้อสอบก่อน');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/import-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          rawText,
          category,
          title,
          description,
          source
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'การวิเคราะห์ข้อสอบล้มเหลว');
      }

      setPreviewCollection(data.collection);
      if (!title && data.collection.title) {
        setTitle(data.collection.title);
      }
      if (!year && data.collection.year) {
        setYear(data.collection.year.toString());
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อสอบ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!previewCollection || !previewCollection.questions?.length) {
      setError('ไม่มีข้อมูลข้อสอบที่จะบันทึก');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/import-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          title: title || previewCollection.title,
          category,
          year: year ? parseInt(year, 10) : previewCollection.year,
          description,
          source,
          questions: previewCollection.questions
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'การบันทึกข้อสอบล้มเหลว');
      }

      setSuccessMessage(`บันทึกชุดข้อสอบ "${data.collection.title}" จำนวน ${previewCollection.questions.length} ข้อ เรียบร้อยแล้ว!`);
      // Reset raw text and preview
      setRawText('');
      setPreviewCollection(null);
      setFileName('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                นำเข้าข้อสอบอัตนัย (Smart Exam Import)
              </h1>
              <div className="text-xs text-slate-500">
                ระบบสกัดข้อสอบ, คำถามวินิจฉัย, ธงคำตอบ, เลขมาตรา และเลขฎีกาอัตโนมัติ
              </div>
            </div>
          </div>

          <Link 
            href="/exams" 
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
          >
            <span>ไปที่คลังข้อสอบ</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-rose-500" />
            <div>
              <div className="font-bold">เกิดข้อผิดพลาด</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
              <div>
                <div className="font-bold">นำเข้าสำเร็จ</div>
                <div className="text-sm">{successMessage}</div>
              </div>
            </div>
            <Link 
              href="/exams"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              ดูข้อสอบในระบบ
            </Link>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            ข้อมูลชุดข้อสอบ
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection - 9 Categories */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                หมวดกฎหมาย (9 หมวดหลัก) <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {EXAM_CATEGORIES.map((cat, idx) => (
                  <option key={cat} value={cat}>
                    {idx + 1}. {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">
                ชื่อชุดข้อสอบ (Title) <span className="text-slate-400 text-xs">(จะถูกดึงอัตโนมัติหากเว้นว่าง)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ข้อสอบเนติบัณฑิต ข้อ 7 (กฎหมายล้มละลายและการฟื้นฟูกิจการ)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Source & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">แหล่งที่มา</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="เช่น เนติบัณฑิตยสภา"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">ปี พ.ศ.</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="เช่น 2545"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Raw Text Input or File Upload */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText size={16} className="text-indigo-600" />
                วางข้อความข้อสอบ หรือ อัปโหลดไฟล์ข้อความ (.txt)
              </label>
              <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Upload size={14} />
                <span>{fileName ? `เปลี่ยนไฟล์ (${fileName})` : 'เลือกไฟล์ .txt'}</span>
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="วางข้อความข้อสอบที่นี่ เช่น:&#10;คำถามข้อ 7&#10;7.1 นายรวยเป็นเจ้าหนี้ตามคำพิพากษา...&#10;ให้วินิจฉัยว่า... (ข้อสอบวันอาทิตย์ที่ 2 มิถุนายน 2545)&#10;ธงคำตอบ นายรวยเจ้าหนี้... (คำพิพากษาศาลฎีกาที่ 5744/2531)"
              className="w-full p-4 font-mono text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isAnalyzing || !rawText.trim()}
              onClick={handleAnalyze}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-xs ${
                isAnalyzing || !rawText.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98'
              }`}
            >
              <Sparkles size={16} />
              <span>{isAnalyzing ? 'กำลังวิเคราะห์ข้อสอบ...' : 'วิเคราะห์ข้อสอบ (Parse & Preview)'}</span>
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {previewCollection && (
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  ผลการวิเคราะห์ข้อสอบ
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {previewCollection.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พบข้อสอบทั้งหมด <strong>{previewCollection.questionsCount} ข้อ</strong> | 
                  ตรวจพบฎีกาตรงในฐานข้อมูล Turso <strong>{previewCollection.matchedDekasCount} คดี</strong>
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Save size={16} />
                <span>{isSaving ? 'กำลังบันทึกลงฐานข้อมูล...' : 'ยืนยันบันทึกเข้าระบบ'}</span>
              </button>
            </div>

            {/* List of Questions */}
            <div className="space-y-4">
              {previewCollection.questions.map((q: any, idx: number) => (
                <div 
                  key={idx} 
                  className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                        {q.questionNumber}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {q.title || `ข้อ ${q.questionNumber}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {q.examDate && (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200 flex items-center gap-1">
                          <Calendar size={12} />
                          {q.examDate}
                        </span>
                      )}
                      {q.examYear && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                          พ.ศ. {q.examYear}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Facts */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ข้อเท็จจริง (Facts):</div>
                    <div className="text-xs sm:text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {q.facts}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                    <div className="text-xs font-bold text-amber-900 mb-0.5 flex items-center gap-1">
                      <span>🎯 ประเด็นที่ให้วินิจฉัย:</span>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-amber-950">
                      {q.prompt}
                    </div>
                  </div>

                  {/* Official Answer */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ธงคำตอบ (Official Answer):</div>
                    <div className="text-xs sm:text-sm text-slate-700 bg-emerald-50/30 p-3 rounded-xl border border-emerald-100 leading-relaxed line-clamp-4">
                      {q.officialAnswer}
                    </div>
                  </div>

                  {/* Tags: Dekas and Sections */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    {/* Related Dekas */}
                    {q.dekaDetails?.map((d: any, dIdx: number) => (
                      <span 
                        key={dIdx}
                        className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium border ${
                          d.matched 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title={d.matched ? 'มีในฐานข้อมูลฎีกา 69,417 คดี' : 'ไม่มีในฐานข้อมูล'}
                      >
                        <Scale size={13} />
                        <span>ฎีกา {d.number}</span>
                        {d.matched && <Check size={12} className="text-emerald-600 font-bold" />}
                      </span>
                    ))}

                    {/* Related Sections */}
                    {q.relatedSections?.map((s: any, sIdx: number) => (
                      <span 
                        key={sIdx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-medium"
                      >
                        <BookOpen size={13} />
                        <span>{s.law ? `${s.law} ` : ''}ม.{s.section}</span>
                      </span>
                    ))}

                    {/* Key Issues Count */}
                    {q.keyIssues?.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        ประเด็นตรวจ: {q.keyIssues.length} ประเด็น
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Save size={16} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึกเข้าระบบ'}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
