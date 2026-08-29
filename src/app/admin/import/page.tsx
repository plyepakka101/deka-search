"use client";

import { useState, useEffect } from "react";
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2, History, Trash2 } from "lucide-react";

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ fileName: string; status: "success" | "error"; message?: string }[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/import/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setResults([]);

    for (const file of files) {
      try {
        const text = await file.text();
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ htmlContent: text, fileName: file.name }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setResults(prev => [...prev, { fileName: file.name, status: "success", message: data.message }]);
        } else {
          setResults(prev => [...prev, { fileName: file.name, status: "error", message: data.error }]);
        }
      } catch (err: any) {
        setResults(prev => [...prev, { fileName: file.name, status: "error", message: err.message }]);
      }
    }
    
    setIsUploading(false);
    fetchHistory(); // Refresh history after upload
  };

  const handleUndoImport = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการนำเข้านี้? ข้อมูลรายการใหม่ทั้งหมดที่นำเข้าในรอบนี้จะถูกลบออก (แต่รายการที่ถูกอัปเดตจะไม่ได้รับผลกระทบ)")) {
      return;
    }

    try {
      const res = await fetch(`/api/import/history?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchHistory();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการยกเลิก");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  return (
    <main className="max-w-4xl mx-auto py-12 px-6 flex-1 w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">นำเข้าข้อมูลคำพิพากษา</h1>
          <p className="text-slate-500 mt-2">อัปโหลดไฟล์ HTML ที่บันทึกมาจากระบบสืบค้นศาลฎีกา เพื่อนำข้อมูลเข้าสู่ฐานข้อมูลในระบบ</p>
        </div>
        <div className="flex gap-2">
          <a 
            href="/admin/import-law" 
            className="shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-emerald-200"
          >
            นำเข้าฐานข้อมูลกฎหมาย
          </a>
          <a 
            href="/admin/fix-data" 
            className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-blue-200"
          >
            แก้ไขคำผิดในฐานข้อมูล
          </a>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 text-center">
          <Upload className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">เลือกไฟล์ HTML</h3>
          <p className="text-slate-500 text-sm mb-6">คุณสามารถเลือกได้หลายไฟล์พร้อมกัน</p>
          
          <input 
            type="file" 
            id="file-upload" 
            multiple 
            accept=".html,.htm" 
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <label 
            htmlFor="file-upload" 
            className="bg-primary hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors"
          >
            เปิดหน้าต่างเลือกไฟล์
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-8">
            <h4 className="font-medium text-slate-900 mb-4 flex items-center justify-between">
              ไฟล์ที่เลือก ({files.length} ไฟล์)
              
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> กำลังนำเข้า...</>
                ) : (
                  <><Upload className="w-4 h-4" /> เริ่มการนำเข้าข้อมูล</>
                )}
              </button>
            </h4>
            
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {files.map((file, i) => {
                const result = results.find(r => r.fileName === file.name);
                
                return (
                  <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileCode className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    
                    {result && (
                      <div className="flex items-center shrink-0 ml-4">
                        {result.status === "success" ? (
                          <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> สำเร็จ
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md" title={result.message}>
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> ล้มเหลว
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" /> 
          ประวัติการนำเข้าข้อมูล
        </h2>

        {isLoadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            ไม่มีประวัติการนำเข้าข้อมูล
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">วันที่ / เวลา</th>
                  <th className="px-4 py-3 font-medium">ชื่อไฟล์</th>
                  <th className="px-4 py-3 font-medium text-center">เพิ่มใหม่</th>
                  <th className="px-4 py-3 font-medium text-center">อัปเดต</th>
                  <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(batch.importedAt).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate" title={batch.fileName}>
                      {batch.fileName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        +{batch.createdCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {batch.updatedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUndoImport(batch.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-md transition-colors"
                        title="ยกเลิกและลบข้อมูลที่เพิ่มใหม่ในรอบนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
