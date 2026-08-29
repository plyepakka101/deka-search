import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { parseLaws } from "@/utils/lawParser";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getCachedSortedLaws = unstable_cache(
  async () => {
    const decisions = await prisma.decision.findMany({
      select: { law: true }
    });

    const counts = new Map<string, { lawName: string, section: string, count: number }>();

    for (const d of decisions) {
      if (!d.law) continue;
      const parsed = parseLaws(d.law);
      
      const seen = new Set<string>();
      
      for (const p of parsed) {
        for (const s of p.sections) {
          const key = `${p.mappedName}|${s}`;
          if (!seen.has(key)) {
            seen.add(key);
            const existing = counts.get(key);
            if (existing) {
              existing.count += 1;
            } else {
              counts.set(key, { lawName: p.mappedName, section: s, count: 1 });
            }
          }
        }
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 500);
  },
  ['sorted-laws-aggregation'],
  { revalidate: 3600, tags: ['laws-aggregation'] } // cache for 1 hour
);

export default async function SearchByLawPage() {
  const sortedLaws = await getCachedSortedLaws();

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          ค้นหาแยกตามกฎหมาย
        </h1>
        <p className="text-slate-500 mt-2">เลือกกฎหมายหรือมาตราที่สนใจเพื่อดูคำพิพากษาที่เกี่ยวข้อง</p>
      </div>

      <div className="space-y-3">
        {sortedLaws.map((l, idx) => (
          <Link 
            key={idx} 
            href={`/search?${new URLSearchParams({
              tab: "law",
              law_name: l.lawName,
              section: l.section
            }).toString()}`} 
            className="block group"
          >
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition-all flex items-center justify-between">
              <span className="font-medium text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
                {l.lawName} มาตรา {l.section}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                  {l.count} รายการ
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {sortedLaws.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-500">ยังไม่มีข้อมูลในระบบ</p>
        </div>
      )}
    </main>
  );
}
