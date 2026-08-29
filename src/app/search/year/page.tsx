import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SearchByYearPage() {
  const years = await prisma.decision.groupBy({
    by: ['decisionYear'],
    _count: {
      _all: true,
    },
    orderBy: {
      decisionYear: 'desc',
    },
  });

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          ค้นหาแยกตามปี พ.ศ.
        </h1>
        <p className="text-slate-500 mt-2">เลือกปี พ.ศ. ที่ต้องการเพื่อดูคำพิพากษาทั้งหมดในปีนั้น</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {years.map((y, idx) => (
          y.decisionYear ? (
            <Link key={idx} href={`/search?year=${y.decisionYear}`} className="group">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col items-center text-center">
                <span className="text-2xl font-bold text-slate-800 group-hover:text-primary transition-colors">
                  {y.decisionYear}
                </span>
                <span className="text-sm text-slate-500 mt-1">
                  {y._count._all} รายการ
                </span>
              </div>
            </Link>
          ) : null
        ))}
      </div>
      
      {years.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-500">ยังไม่มีข้อมูลในระบบ</p>
        </div>
      )}
    </main>
  );
}
