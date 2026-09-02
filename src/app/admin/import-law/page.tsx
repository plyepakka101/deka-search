"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, ChevronLeft, Check, AlertCircle } from 'lucide-react';

export default function ImportLawPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const colors = [
    { name: 'Red', value: 'bg-red-500' },
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Yellow', value: 'bg-yellow-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Teal', value: 'bg-teal-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Slate', value: 'bg-slate-600' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !abbreviation) {
      setStatus('error');
      setMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setIsUploading(true);
    setStatus('idle');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('abbreviation', abbreviation);
      formData.append('color', color);
      formData.append('description', description);
      formData.append('sourceUrl', sourceUrl);

      const response = await fetch('/api/admin/import-law', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import law');
      }

      setStatus('success');
      setMessage('นำเข้ากฎหมายสำเร็จ');
      setFile(null);
      setName('');
      setAbbreviation('');
      setDescription('');
      setSourceUrl('');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.message || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-slate-800">นำเข้าตัวบทกฎหมาย</h1>
            <div className="text-xs text-slate-500">อัปโหลดไฟล์ .txt เพื่อเพิ่มกฎหมายใหม่เข้าระบบ</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {status === 'success' && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-start gap-3">
            <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">สำเร็จ</div>
              <div className="text-sm opacity-90">{message}</div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">เกิดข้อผิดพลาด</div>
              <div className="text-sm opacity-90">{message}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">ชื่อกฎหมาย (เต็ม) <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">คำย่อกฎหมาย <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="เช่น พ.ร.บ.คอมพิวเตอร์"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              <div className="text-xs text-slate-500">ใช้สำหรับการทำลิงก์อัตโนมัติในคำพิพากษา</div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">รายละเอียด (Optional)</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับกฎหมายฉบับนี้"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">ลิงก์ต้นฉบับ (Optional)</label>
              <input 
                type="url" 
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="เช่น https://searchlaw.ocs.go.th/..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              <div className="text-xs text-slate-500">ลิงก์สำหรับตรวจสอบความถูกต้องกับต้นฉบับ (แสดงปุ่มลิงก์ที่มุมขวาล่างของทุกมาตรา)</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">สีสัญลักษณ์</label>
              <div className="flex flex-wrap gap-2 items-center">
                {colors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full ${c.value} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
                
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-400" title="เลือกสีอื่นๆ">
                  <input
                    type="color"
                    value={color.startsWith('#') ? color : '#3b82f6'}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer border-0 p-0"
                  />
                  {color.startsWith('#') && <Check className="w-4 h-4 text-white absolute pointer-events-none drop-shadow-md" />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">ไฟล์ตัวบทกฎหมาย (.txt) <span className="text-rose-500">*</span></label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center">
                <input
                  type="file"
                  accept=".txt"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">คลิกเพื่อเลือกไฟล์</span> หรือลากไฟล์มาวาง
                  </div>
                  <div className="text-sm text-slate-500">
                    {file ? file.name : 'รองรับเฉพาะไฟล์ .txt เท่านั้น'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !file || !name || !abbreviation}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังนำเข้า...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  เริ่มนำเข้ากฎหมาย
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
