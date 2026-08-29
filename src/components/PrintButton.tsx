"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ title }: { title?: string }) {
  const handlePrint = () => {
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }
    window.print();
    if (title) {
      // restore after a tiny delay to ensure the print dialog caught the new title
      setTimeout(() => { document.title = originalTitle; }, 100);
    }
  };

  return (
    <button 
      onClick={handlePrint} 
      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors print:hidden"
    >
      <Printer className="w-4 h-4" />
      พิมพ์คำพิพากษา
    </button>
  );
}
