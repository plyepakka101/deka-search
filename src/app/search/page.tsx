import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Filter, FileText, ChevronRight, Hash } from "lucide-react";
import BookmarkButton from "@/components/BookmarkButton";
import PinToSectionButton from "@/components/PinToSectionButton";
import PopularSearches from "@/components/PopularSearches";
import BooleanSearchInput from "@/components/BooleanSearchInput";
import { parseLaws, LAW_MAP, getSectionCategory, initCategoryCache } from "@/utils/lawParser";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getCachedLawAggregations = unstable_cache(
  async () => {
    await initCategoryCache();
    const allDecisions = await prisma.decision.findMany({ select: { law: true } });
    
    const lawDict: Record<string, number> = {};
    const sectionDictByLaw: Record<string, Record<string, number>> = {};

    allDecisions.forEach(d => {
      if (!d.law) return;
      const parsed = parseLaws(d.law);
      
      const seenLaws = new Set<string>();
      parsed.forEach(p => {
        if (!seenLaws.has(p.mappedName)) {
          seenLaws.add(p.mappedName);
          lawDict[p.mappedName] = (lawDict[p.mappedName] || 0) + 1;
        }

        if (!sectionDictByLaw[p.mappedName]) {
          sectionDictByLaw[p.mappedName] = {};
        }
        const seenSections = new Set<string>();
        p.sections.forEach(s => {
          if (!seenSections.has(s)) {
            seenSections.add(s);
            sectionDictByLaw[p.mappedName][s] = (sectionDictByLaw[p.mappedName][s] || 0) + 1;
          }
        });
      });
    });

    const lawGroups = Object.keys(lawDict)
      .map(k => ({ law: k, _count: lawDict[k] }))
      .sort((a, b) => b._count - a._count);

    const lawSections: Record<string, { category: string; sections: { section: string; _count: number }[] }[]> = {};
    
    for (const lawName of Object.keys(sectionDictByLaw)) {
      const sectionDict = sectionDictByLaw[lawName];
      const categoryMap = new Map<string, { section: string; _count: number }[]>();
      
      Object.keys(sectionDict).forEach(k => {
         const category = getSectionCategory(lawName, k);
         if (!categoryMap.has(category)) {
           categoryMap.set(category, []);
         }
         categoryMap.get(category)!.push({ section: k, _count: sectionDict[k] });
      });
      
      const sortedCategories = Array.from(categoryMap.keys()).sort();
      
      lawSections[lawName] = sortedCategories.map(cat => {
         const sections = categoryMap.get(cat)!;
         sections.sort((a, b) => {
            const numA = parseFloat(a.section.match(/\d+(\.\d+)?/)?.[0] || "0");
            const numB = parseFloat(b.section.match(/\d+(\.\d+)?/)?.[0] || "0");
            return numA - numB;
         });
         return { category: cat, sections };
      });
    }

    return { lawGroups, lawSections };
  },
  ['law-aggregations-v3'],
  { revalidate: 3600, tags: ['laws-aggregation'] }
);

function buildBaseCondition(term: string) {
  const cleanTerm = term.replace(/^"|"$/g, "").trim();
  if (!cleanTerm) return {};
  return {
    OR: [
      { decisionNumber: { contains: cleanTerm } },
      { parties: { contains: cleanTerm } },
      { shortSummary: { contains: cleanTerm } },
      { longSummary: { contains: cleanTerm } },
      { law: { contains: cleanTerm } },
    ]
  };
}

function parseBooleanQuery(q: string): any {
  if (!q.trim()) return {};

  // 1. Split by OR
  if (q.includes(" หรือ ")) {
    const parts = q.split(" หรือ ");
    return { OR: parts.map(p => parseBooleanQuery(p)) };
  }
  
  // 2. Split by AND
  if (q.includes(" และ ")) {
    const parts = q.split(" และ ");
    return { AND: parts.map(p => parseBooleanQuery(p)) };
  }
  
  // 3. Handle NOT (e.g. "A ยกเว้น B")
  if (q.includes(" ยกเว้น ")) {
    const parts = q.split(" ยกเว้น ");
    if (parts.length === 2) {
      return {
        AND: [
          parseBooleanQuery(parts[0]),
          { NOT: parseBooleanQuery(parts[1]) }
        ]
      };
    }
  }

  return buildBaseCondition(q);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const year = typeof params.year === "string" ? parseInt(params.year) : undefined;
  const tab = typeof params.tab === "string" ? params.tab : undefined;
  const law_name = typeof params.law_name === "string" ? params.law_name : undefined;
  const section = typeof params.section === "string" ? params.section : undefined;

  // Build the Prisma query
  let whereClause: any = {};
  
  if (q) {
    const booleanCondition = parseBooleanQuery(q);
    if (Object.keys(booleanCondition).length > 0) {
      whereClause = { ...booleanCondition };
    }
  }
  
  if (year && !isNaN(year)) {
    if (whereClause.AND) {
      whereClause.AND.push({ decisionYear: year });
    } else if (Object.keys(whereClause).length > 0) {
      // If there's an existing condition but not an AND at the root
      const existing = { ...whereClause };
      whereClause = { AND: [existing, { decisionYear: year }] };
    } else {
      whereClause.decisionYear = year;
    }
  }

  const isWhereClauseEmpty = Object.keys(whereClause).length === 0;

  // Fetch results based on tab
  let results: any[] = [];
  let lawGroups: { law: string; _count: number }[] = [];
  let yearGroups: any = [];
  // category -> list of sections
  let sectionGroupsByCategory: { category: string; sections: { section: string; _count: number }[] }[] = [];

  if (tab === "law") {
    if (isWhereClauseEmpty && !section) {
      // Use purely cached aggregations for Level 1 & 2 when there are no filters
      const aggs = await getCachedLawAggregations();
      if (!law_name) {
        lawGroups = aggs.lawGroups;
      } else {
        const rawSections = aggs.lawSections[law_name] || [];
        const shouldHideFallback = rawSections.length > 1;
        sectionGroupsByCategory = rawSections.filter(group => !(shouldHideFallback && group.category.includes('(มาตราทั่วไป / อื่นๆ)')));
      }
    } else if (!law_name || !section) {
      // Dynamic computation for Level 1 & 2 if there ARE filters (e.g., year)
      const allDecisions = await prisma.decision.findMany({
        select: { id: true, law: true },
        where: whereClause
      });

      if (!law_name) {
        // Level 1 Dynamic
        const lawDict: Record<string, number> = {};
        allDecisions.forEach(d => {
          if (!d.law) return;
          const parsed = parseLaws(d.law);
          const seen = new Set<string>();
          parsed.forEach(p => {
            if (!seen.has(p.mappedName)) {
              seen.add(p.mappedName);
              lawDict[p.mappedName] = (lawDict[p.mappedName] || 0) + 1;
            }
          });
        });
        lawGroups = Object.keys(lawDict)
          .map(k => ({ law: k, _count: lawDict[k] }))
          .sort((a, b) => b._count - a._count);
      } else {
        // Level 2 Dynamic
        const sectionDict: Record<string, number> = {};
        allDecisions.forEach(d => {
          if (!d.law) return;
          const parsed = parseLaws(d.law);
          const match = parsed.find(p => p.mappedName === law_name);
          if (match) {
            const seen = new Set<string>();
            match.sections.forEach(s => {
              if (!seen.has(s)) {
                seen.add(s);
                sectionDict[s] = (sectionDict[s] || 0) + 1;
              }
            });
          }
        });
        
        await initCategoryCache();
        const categoryMap = new Map<string, { section: string; _count: number }[]>();
        Object.keys(sectionDict).forEach(k => {
           const category = getSectionCategory(law_name, k);
           if (!categoryMap.has(category)) {
             categoryMap.set(category, []);
           }
           categoryMap.get(category)!.push({ section: k, _count: sectionDict[k] });
        });
        
        const sortedCategories = Array.from(categoryMap.keys()).sort();
        const shouldHideFallback = sortedCategories.length > 1;
        sectionGroupsByCategory = sortedCategories
           .filter(cat => !(shouldHideFallback && cat.includes('(มาตราทั่วไป / อื่นๆ)')))
           .map(cat => {
             const sections = categoryMap.get(cat)!;
             sections.sort((a, b) => {
                const numA = parseFloat(a.section.match(/\d+(\.\d+)?/)?.[0] || "0");
                const numB = parseFloat(b.section.match(/\d+(\.\d+)?/)?.[0] || "0");
                return numA - numB;
             });
             return { category: cat, sections };
           });
      }
    } else {
      // Level 3: Actual results for this section
      // First filter DB by CONTAINS section to dramatically reduce JS parsing overhead
      const candidateDecisions = await prisma.decision.findMany({
        select: { id: true, law: true },
        where: {
          ...whereClause,
          law: { contains: section }
        }
      });
      
      const matchingIds = candidateDecisions.filter(d => {
        if (!d.law) return false;
        const parsed = parseLaws(d.law);
        const match = parsed.find(p => p.mappedName === law_name);
        return match && match.sections.includes(section);
      }).map(d => d.id);
      
      results = await prisma.decision.findMany({
        where: { 
          id: { in: matchingIds },
          ...whereClause 
        },
        orderBy: { decisionYear: "desc" },
      });
    }

  } else if (tab === "year") {
    yearGroups = await prisma.decision.groupBy({
      by: ["decisionYear"],
      _count: { id: true },
      where: whereClause as any,
      orderBy: { decisionYear: "desc" },
    });
  } else {
    results = await prisma.decision.findMany({
      where: whereClause,
      orderBy: { decisionYear: "desc" },
      take: 50,
    });
  }

  return (
    <main className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
      
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
          <h2 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-accent" /> ตัวกรองการค้นหา
          </h2>
          
          <form method="GET" action="/search" className="space-y-4">
            <BooleanSearchInput defaultValue={q} />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ปี พ.ศ.</label>
              <input 
                type="number" 
                name="year" 
                defaultValue={year || ""}
                placeholder="เช่น 2565" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors">
              กรองข้อมูล
            </button>
          </form>
        </div>
      </aside>

      {/* Search Results */}
      <div className="flex-1">
        <PopularSearches className="mb-6 justify-start" />
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {tab === 'law' ? 'แยกตามกฎหมาย' : tab === 'year' ? 'แยกตามปี พ.ศ.' : 'ผลการค้นหา'}
            </h1>
            <p className="text-slate-500 mt-1">
              {tab === 'law' 
                ? (!law_name 
                    ? `พบ ${lawGroups.length} หมวดหมู่กฎหมาย` 
                    : !section 
                      ? `พบ ${sectionGroupsByCategory.reduce((sum, g) => sum + g.sections.length, 0)} มาตรา ใน ${law_name}`
                      : `พบ ${results.length} รายการ ที่อ้างอิง ${law_name} มาตรา ${section}`)
                : tab === 'year' 
                  ? `พบ ${yearGroups.length} ปีที่มีคำพิพากษา` 
                  : `พบ ${results.length} รายการ`
              } {q ? `สำหรับ "${q}"` : ""}
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <Link href={`/search?${q ? `q=${q}` : ''}`} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>รายการทั้งหมด</Link>
            <Link href={`/search?tab=law${q ? `&q=${q}` : ''}`} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'law' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>แยกตามกฎหมาย</Link>
            <Link href={`/search?tab=year${q ? `&q=${q}` : ''}`} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>แยกตามปี</Link>
          </div>
        </div>

        {(!tab && results.length === 0) || 
         (tab === 'law' && !law_name && lawGroups.length === 0) || 
         (tab === 'law' && law_name && !section && sectionGroupsByCategory.length === 0) || 
         (tab === 'law' && law_name && section && results.length === 0) || 
         (tab === 'year' && yearGroups.length === 0) ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ไม่พบข้อมูล</h3>
            <p className="text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือนำเข้าข้อมูล HTML ทางหน้า Admin</p>
            <Link href="/admin/import" className="inline-block mt-4 text-accent hover:underline">
              ไปที่หน้านำเข้าข้อมูล
            </Link>
          </div>
        ) : tab === 'law' ? (
          !law_name ? (
            // Level 1: List of Laws
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lawGroups.map((group, idx) => (
                <Link key={idx} href={`/search?tab=law&law_name=${encodeURIComponent(group.law)}${q ? `&q=${q}` : ''}`} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 line-clamp-1">{group.law || "ไม่ระบุกฎหมาย"}</h3>
                      <p className="text-sm text-slate-500">{group._count} คำพิพากษา</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          ) : !section ? (
            // Level 2: List of Sections with Categories
            <div className="space-y-10">
              {sectionGroupsByCategory.map((group, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <div className="w-2 h-6 bg-accent rounded-full"></div>
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {group.sections.map((s, i) => (
                      <Link
                        key={i}
                        href={`/search?${new URLSearchParams({
                          ...(q ? { q } : {}),
                          ...(year ? { year: year.toString() } : {}),
                          tab: "law",
                          law_name,
                          section: s.section
                        }).toString()}`}
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-accent/5 hover:border-accent/30 border border-transparent transition-all group"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-accent mb-1 text-center">มาตรา {s.section}</span>
                        <span className="text-xs bg-white px-3 py-1 rounded-full text-slate-500 shadow-sm border border-slate-100">{s._count} คดี</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Level 3: List of Decisions
            <div className="space-y-4">
              {results.map((decision) => (
                <div key={decision.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <Link href={`/decision/${decision.id}`} className="block">
                        <h2 className="text-xl font-bold text-primary group-hover:text-accent transition-colors">
                          คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                        </h2>
                      </Link>
                      {decision.decisionYear && (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                          ปี {decision.decisionYear}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {tab === 'law' && law_name && section && (
                        <PinToSectionButton 
                          decisionId={decision.id} 
                          lawName={law_name} 
                          sectionNumber={section} 
                        />
                      )}
                      <BookmarkButton decision={{
                        id: decision.id,
                        decisionNumber: decision.decisionNumber,
                        decisionYear: decision.decisionYear,
                        parties: decision.parties,
                        shortSummary: decision.shortSummary
                      }} />
                    </div>
                  </div>
                  
                  {decision.parties && (
                    <p className="text-slate-700 font-medium mb-3">
                      <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                      {decision.parties}
                    </p>
                  )}
                  
                  {decision.shortSummary && (
                    <div className="text-slate-600 text-sm leading-relaxed mb-4">
                      {decision.shortSummary}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                    {decision.law && (
                      <div className="flex items-center text-xs text-slate-500 max-w-xl truncate">
                        <FileText className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">{decision.law}</span>
                      </div>
                    )}
                    
                    <Link href={`/decision/${decision.id}`} className="flex items-center text-sm font-medium text-accent hover:text-primary transition-colors ml-auto">
                      อ่านฉบับเต็ม <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'year' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {yearGroups.map((group: any, idx: number) => (
              <Link key={idx} href={`/search?year=${group.decisionYear}`} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent/30 transition-all flex flex-col items-center justify-center text-center group gap-2">
                <h3 className="text-2xl font-black text-slate-800 group-hover:text-accent transition-colors">
                  {group.decisionYear ? group.decisionYear : "ไม่ระบุปี"}
                </h3>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                  {group._count.id} คดี
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((decision) => (
              <div key={decision.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/decision/${decision.id}`} className="block">
                      <h2 className="text-xl font-bold text-primary group-hover:text-accent transition-colors">
                        คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
                      </h2>
                    </Link>
                    {decision.decisionYear && (
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                        ปี {decision.decisionYear}
                      </span>
                    )}
                  </div>
                  <BookmarkButton decision={{
                    id: decision.id,
                    decisionNumber: decision.decisionNumber,
                    decisionYear: decision.decisionYear,
                    parties: decision.parties,
                    shortSummary: decision.shortSummary
                  }} />
                </div>
                
                {decision.parties && (
                  <p className="text-slate-700 font-medium mb-3">
                    <span className="text-slate-400 font-normal mr-2">คู่ความ:</span>
                    {decision.parties}
                  </p>
                )}
                
                {decision.shortSummary && (
                  <div className="text-slate-600 text-sm leading-relaxed mb-4">
                    {decision.shortSummary}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                  {decision.law && (
                    <div className="flex items-center text-xs text-slate-500 max-w-xl truncate">
                      <FileText className="w-4 h-4 mr-1.5 shrink-0" />
                      <span className="truncate">{decision.law}</span>
                    </div>
                  )}
                  
                  <Link href={`/decision/${decision.id}`} className="flex items-center text-sm font-medium text-accent hover:text-primary transition-colors ml-auto">
                    อ่านฉบับเต็ม <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
