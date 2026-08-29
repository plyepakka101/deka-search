import { Search, Scale, BookOpen, Clock, Database } from "lucide-react";
import Link from "next/link";
import PopularSearches from "@/components/PopularSearches";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const totalDecisions = await prisma.decision.count();
  
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full bg-slate-900 text-white pt-24 pb-32 px-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50 mix-blend-screen" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl opacity-40 mix-blend-screen" />
        </div>

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center gap-6">
          <Scale className="w-16 h-16 text-accent mb-2" strokeWidth={1.5} />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-md">
            สืบค้นคำพิพากษาศาลฎีกา
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-light">
            ระบบสืบค้นข้อมูลคำพิพากษา คำสั่งคำร้อง และคำวินิจฉัยศาลฎีกาที่รวดเร็ว ทันสมัย และครอบคลุม
          </p>
          
          <div className="flex items-center gap-2 mt-2 text-sm md:text-base text-accent font-medium bg-accent/10 px-5 py-2 rounded-full border border-accent/20 shadow-sm">
            <Database className="w-4 h-4" />
            <span>ฐานข้อมูลปัจจุบันมีคำพิพากษาทั้งหมด {totalDecisions.toLocaleString()} คดี</span>
          </div>

          {/* Search Bar */}
          <div className="w-full max-w-3xl mt-8 relative group">
            <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-lg transition-all group-hover:bg-accent/30 duration-300" />
            <form action="/search" method="GET" className="relative bg-white rounded-2xl p-2 flex items-center shadow-2xl ring-1 ring-slate-800">
              <div className="pl-4 pr-2">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <input
                type="text"
                name="q"
                placeholder="ค้นหาด้วยคำค้นหา, เลขคดี หรือชื่อกฎหมาย..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 text-lg py-3 px-2 placeholder:text-slate-400"
              />
              <button type="submit" className="bg-primary text-white hover:bg-slate-800 px-8 py-3 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap">
                ค้นหา
              </button>
            </form>
          </div>

          <PopularSearches theme="dark" className="mt-4" />

          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/search" className="text-accent hover:text-white transition-colors underline-offset-4 hover:underline">
              ค้นหาขั้นสูง
            </Link>
            <span className="text-slate-600">|</span>
            <Link href="/search/law" className="text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline">
              แยกตามกฎหมาย
            </Link>
            <span className="text-slate-600">|</span>
            <Link href="/search/year" className="text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline">
              แยกตามปี พ.ศ.
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Categories */}
      <section className="max-w-6xl w-full mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <QuickAccessCard 
            icon={<BookOpen className="w-8 h-8" />}
            title="ค้นหาตามกฎหมาย"
            description="สืบค้นคำพิพากษาโดยอ้างอิงจากประมวลกฎหมาย มาตรา หรือพระราชบัญญัติต่างๆ"
            href="/search/law"
          />
          <QuickAccessCard 
            icon={<Clock className="w-8 h-8" />}
            title="คำพิพากษาล่าสุด"
            description="ติดตามคำพิพากษาและคำสั่งศาลฎีกาที่มีการเผยแพร่ใหม่ล่าสุด"
            href="/search?sort=latest"
          />
          <QuickAccessCard 
            icon={<Scale className="w-8 h-8" />}
            title="ค้นหาตามศาล"
            description="ค้นหาข้อมูลแยกตามศาลชั้นต้น ศาลอุทธรณ์ หรือแผนกคดีต่างๆ"
            href="/search/court"
          />
        </div>
      </section>
    </main>
  );
}

function QuickAccessCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href: string }) {
  return (
    <Link href={href} className="group">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent/30 h-full flex flex-col">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed flex-1">{description}</p>
        <div className="mt-6 flex items-center text-accent font-medium group-hover:text-primary transition-colors">
          ดูรายละเอียด <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </Link>
  );
}
