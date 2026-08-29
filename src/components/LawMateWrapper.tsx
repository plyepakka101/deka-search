"use client";

import dynamic from "next/dynamic";

const LawMateApp = dynamic(() => import("./law-mate/App"), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-slate-500">Loading Law Mate...</div>,
});

export default function LawMateWrapper() {
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <LawMateApp />
    </div>
  );
}
