import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Scale, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SearchByCourtPage() {
  const courts = await prisma.decision.groupBy({
    by: ['court'],
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        court: 'desc'
      }
    },
    take: 50,
  });

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          ค้นหาแยกตามศาลที่ตัดสิน
        </h1>
        <p className="text-slate-500 mt-2">เลือกศาลชั้นต้นหรือศาลอุทธรณ์ เพื่อดูคำพิพากษาที่ส่งมาจากศาลนั้นๆ</p>
      </div>

      <div className="space-y-3">
        {courts.map((c, idx) => (
          c.court ? (
            <Link key={idx} href={`/search?q=${encodeURIComponent(c.court)}`} className="block group">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition-all flex items-center justify-between">
                <span className="font-medium text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
                  {c.court}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {c._count._all} รายการ
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ) : null
        ))}
      </div>
      
      {courts.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-500">ยังไม่มีข้อมูลในระบบ</p>
        </div>
      )}
    </main>
  );
}
