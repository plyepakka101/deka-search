"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface PreviewResult {
  id: number;
  decisionNumber: string;
  oldLaw: string | null;
  newLaw: string | null;
  oldShort: string | null;
  newShort: string | null;
  oldLong: string | null;
  newLong: string | null;
}

export default function FixDataPage() {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [lawFilter, setLawFilter] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  
  const [results, setResults] = useState<PreviewResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!find) {
      setMessage('กรุณาระบุคำที่ต้องการค้นหา');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/fix-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', find, replace, lawFilter, decisionNumber })
      });
      
      const data = await res.json();
      if (res.ok) {
        setResults(data.data);
        // Select all by default
        setSelectedIds(new Set(data.data.map((r: PreviewResult) => r.id)));
        setMessage(`พบข้อมูลที่เข้าข่าย ${data.count} คดี (คลิกปุ่ม 'ยืนยันการแก้ไข' ด้านล่างเพื่อทำการแก้ไขในฐานข้อมูล)`);
      } else {
        setMessage(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) {
      setMessage('กรุณาเลือกคดีที่ต้องการแก้ไขอย่างน้อย 1 คดี');
      return;
    }

    if (!confirm(`คุณต้องการยืนยันการแก้ไขข้อมูลจำนวน ${selectedIds.size} คดี ใช่หรือไม่?`)) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/fix-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'apply', 
          find, 
          replace, 
          lawFilter, 
          decisionNumber,
          targetIds: Array.from(selectedIds)
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`ทำการแก้ไขเรียบร้อยแล้วจำนวน ${data.updatedCount} คดี!`);
        setResults([]); // Clear results after successful apply
      } else {
        setMessage(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(results.map(r => r.id))); // Select all
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Helper to safely highlight text diff roughly (bolding the replacement text)
  const renderHighlight = (text: string | null, newText: string | null) => {
    if (!text || !newText || text === newText) {
      return <span className="text-gray-500 text-sm italic">ไม่มีการเปลี่ยนแปลง</span>;
    }
    
    // Split newText by 'replace' string to highlight it
    if (replace) {
      const parts = newText.split(new RegExp(`(${replace})`, 'g'));
      return (
        <div className="text-sm">
          {parts.map((part, i) => 
            part === replace ? <strong key={i} className="bg-yellow-200 text-red-700 px-1 rounded">{part}</strong> : <span key={i}>{part}</span>
          )}
        </div>
      );
    }
    return <div className="text-sm">{newText}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              เครื่องมือแก้ไขข้อมูล (Find & Replace)
            </h1>
            <p className="text-slate-500 mt-1">ค้นหาคำที่พิมพ์ผิดในฐานข้อมูล และแทนที่ด้วยคำที่ถูกต้อง</p>
          </div>
          <Link href="/admin/import" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            กลับไปหน้านำเข้าข้อมูล
          </Link>
        </div>

        {/* Search Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <form onSubmit={handlePreview} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">ข้อความที่พิมพ์ผิด (Find) *</label>
              <input 
                type="text" 
                value={find} 
                onChange={e => setFind(e.target.value)}
                placeholder="เช่น 801" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">ข้อความที่ถูกต้อง (Replace) *</label>
              <input 
                type="text" 
                value={replace} 
                onChange={e => setReplace(e.target.value)}
                placeholder="เช่น 80" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">เฉพาะกฎหมาย (ตัวกรองทางเลือก)</label>
              <input 
                type="text" 
                value={lawFilter} 
                onChange={e => setLawFilter(e.target.value)}
                placeholder="เช่น อาญา, แพ่ง" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">เฉพาะเลขคำพิพากษา (ตัวกรองทางเลือก)</label>
              <input 
                type="text" 
                value={decisionNumber} 
                onChange={e => setDecisionNumber(e.target.value)}
                placeholder="เช่น 565/2520" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? 'กำลังค้นหา...' : 'ตรวจสอบรายการที่เข้าข่าย (Preview)'}
              </button>
            </div>
          </form>
          
          {message && (
            <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${message.includes('ผิดพลาด') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">รายการที่จะถูกแก้ไข ({results.length} คดี)</h2>
              <button 
                onClick={handleApply}
                disabled={isLoading || selectedIds.size === 0}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                ยืนยันการแก้ไข {selectedIds.size} คดีที่เลือก
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.size === results.length && results.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 font-semibold w-32">เลขคำพิพากษา</th>
                    <th className="p-4 font-semibold">กฎหมาย (หลังแก้)</th>
                    <th className="p-4 font-semibold">ย่อสั้น (หลังแก้)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => (
                    <tr key={r.id} className={selectedIds.has(r.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50'}>
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                        <Link href={`/decision/${encodeURIComponent(r.decisionNumber)}`} target="_blank" className="text-blue-600 hover:underline">
                          {r.decisionNumber}
                        </Link>
                      </td>
                      <td className="p-4">
                        {renderHighlight(r.oldLaw, r.newLaw)}
                      </td>
                      <td className="p-4">
                        {renderHighlight(r.oldShort, r.newShort)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
