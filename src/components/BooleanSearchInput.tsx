"use client";

import { useState, useRef } from "react";

export default function BooleanSearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertText = (text: string) => {
    if (!inputRef.current) return;
    
    const start = inputRef.current.selectionStart || value.length;
    const end = inputRef.current.selectionEnd || value.length;
    
    // If inserting quotes, wrap the selection or insert empty quotes
    if (text === '""') {
      const selected = value.substring(start, end);
      const newValue = value.substring(0, start) + `"${selected}"` + value.substring(end);
      setValue(newValue);
      
      // Focus back and put cursor inside quotes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = selected ? start + selected.length + 2 : start + 1;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
      return;
    }

    // Otherwise insert the operator with spaces
    const insertion = ` ${text} `;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    setValue(newValue);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + insertion.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">คำค้นหา (ค้นหาแบบละเอียด)</label>
      <input 
        ref={inputRef}
        type="text" 
        name="q" 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='เช่น สัญญา และ เช่า, "ฟ้องหย่า"' 
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
      />
      
      <div className="flex flex-wrap gap-2 mt-2">
        <button 
          type="button" 
          onClick={() => insertText("และ")}
          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
          title="ต้องมีคำทั้งสองคำ"
        >
          .และ.
        </button>
        <button 
          type="button" 
          onClick={() => insertText("หรือ")}
          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
          title="มีคำใดคำหนึ่งก็ได้"
        >
          .หรือ.
        </button>
        <button 
          type="button" 
          onClick={() => insertText("ยกเว้น")}
          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
          title="ไม่รวมคำที่ตามหลัง"
        >
          .ยกเว้น.
        </button>
        <button 
          type="button" 
          onClick={() => insertText('""')}
          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
          title="ค้นหาด้วยวลีตรงตัว"
        >
          "วลีเป๊ะๆ"
        </button>
      </div>
    </div>
  );
}
