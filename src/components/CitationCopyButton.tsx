"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CitationCopyButton({ citationText, className = "" }: { citationText: string, className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      title="คัดลอกรูปแบบอ้างอิง"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">คัดลอกแล้ว</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">คัดลอกอ้างอิง</span>
        </>
      )}
    </button>
  );
}
