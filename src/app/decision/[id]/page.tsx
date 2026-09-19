import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scale, FileText, User, Gavel, Building2, MapPin, GraduationCap, ChevronRight } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import BookmarkButton from "@/components/BookmarkButton";
import { TextWithLawLinks } from "@/components/TextWithLawLinks";
import CitationCopyButton from "@/components/CitationCopyButton";
import FontSizeController from "@/components/FontSizeController";
import React from 'react';
import LawLinkList from "@/components/LawLinkList";
import { getLawBooksMeta } from "@/lib/laws";

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decision = await prisma.decision.findUnique({
    where: { id },
  });

  if (!decision) {
    notFound();
  }

  const books = await getLawBooksMeta();

  // Find if this Deka decision has ever been cited in any ExamQuestion
  const relatedExams = await prisma.examQuestion.findMany({
    where: {
      relatedDekas: {
        contains: decision.decisionNumber
      }
    },
    include: {
      collection: {
        select: {
          title: true,
          source: true,
          year: true
        }
      }
    },
    take: 5
  });

  return (
    <>
    <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <Link href="/search" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปหน้าค้นหา
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <FontSizeController />
          <CitationCopyButton 
            citationText={`คำพิพากษาศาลฎีกาที่ ${decision.decisionNumber} (พ.ศ. ${decision.decisionYear}) - ${decision.parties || ""}`}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          />
          <BookmarkButton decision={{
            id: decision.id,
            decisionNumber: decision.decisionNumber,
            decisionYear: decision.decisionYear,
            parties: decision.parties,
            shortSummary: decision.shortSummary
          }} className="bg-white border border-slate-200 shadow-sm" />
          <PrintButton title={decision.decisionNumber.replace(/\//g, "_")} />
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -z-10" />
        <Scale className="absolute top-8 right-8 w-32 h-32 text-slate-100 -z-10" />

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-primary leading-tight">
            คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
          </h1>
          {decision.decisionYear && (
            <div className="mt-4 inline-flex items-center text-accent font-semibold text-lg">
              ปี พ.ศ. {decision.decisionYear}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-12 border-b border-slate-100 pb-10">
          {decision.parties && (
            <DetailRow icon={<User />} label="ชื่อคู่ความ" value={
              <div className="flex flex-col gap-1">
                {decision.parties
                  .replace(/\s+(จำเลย|ผู้ร้อง|ผู้คัดค้าน|โจทก์ร่วม|จำเลยร่วม)\s*-/g, '\n$1 -')
                  .split('\n')
                  .map((p, i) => <div key={i}>{p.trim()}</div>)}
              </div>
            } fullWidth />
          )}
          {decision.law && (
            <DetailRow icon={<FileText />} label="ชื่อกฎหมาย" value={<LawLinkList lawText={decision.law} books={books} />} fullWidth />
          )}
          {decision.judge && (
            <DetailRow icon={<Gavel />} label="ชื่อองค์คณะ" value={decision.judge} />
          )}
          {decision.court && (
            <DetailRow icon={<Building2 />} label="ศาลที่ตัดสิน" value={
              <div className="flex flex-col gap-1">
                {decision.court
                  .replace(/\s+(ศาลอุทธรณ์|ศาลฎีกา|แผนก|หมายเลขคดีดำ|หมายเลขคดีแดง|หมายเหตุ)/g, '\n$1')
                  .split('\n')
                  .map((p, i) => <div key={i}>{p.trim()}</div>)}
              </div>
            } />
          )}
          {decision.caseNumberSupreme && (
            <DetailRow icon={<MapPin />} label="หมายเลขคดีคำศาลฎีกา" value={decision.caseNumberSupreme} />
          )}
          {decision.caseNumberLower && (
            <DetailRow icon={<MapPin />} label="หมายเลขคดีศาลชั้นต้น" value={decision.caseNumberLower} />
          )}
        </div>

        <div className="space-y-10" style={{ fontSize: 'var(--content-font-size, 16px)' }}>
          {/* Exam Spotlight Banner */}
          {relatedExams.length > 0 && (
            <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-amber-50/50 rounded-2xl border border-indigo-200/80 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                      คลังข้อสอบอัตนัย
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      คำพิพากษานี้เคยถูกนำไปออกข้อสอบ ({relatedExams.length} ข้อ)
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    คำพิพากษาศาลฎีกานี้เป็นประเด็นหลักในข้อสอบ
                  </h4>
                  <div className="mt-3 space-y-2">
                    {relatedExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/90 rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded border border-indigo-200/60 shrink-0">
                            ข้อ {exam.questionNumber}
                          </span>
                          <span className="text-xs text-slate-800 font-semibold truncate">
                            {exam.collection?.title || exam.title || `ข้อสอบข้อ ${exam.questionNumber}`}
                          </span>
                        </div>
                        <Link
                          href={`/exams/${exam.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                        >
                          <span>ฝึกทำข้อสอบข้อนี้</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {decision.shortSummary && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-accent rounded-full" />
                ย่อสั้น
              </h3>
              <div className="prose prose-slate max-w-none text-slate-700 font-medium" style={{ fontSize: 'inherit', lineHeight: '1.8' }}>
                {decision.shortSummary.split('\n').map((paragraph, idx) => (
                  <div key={idx} className="mb-4"><TextWithLawLinks text={paragraph} books={books} /></div>
                ))}
              </div>
            </section>
          )}

          {decision.longSummary && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                ย่อยาว
              </h3>
              <div className="prose prose-slate max-w-none text-slate-700" style={{ fontSize: 'inherit', lineHeight: '1.8' }}>
                  {decision.longSummary.split('\n').map((paragraph, idx) => (
                    <div key={idx} className="mb-4"><TextWithLawLinks text={paragraph} books={books} /></div>
                  ))}
              </div>
            </section>
          )}
          
          {decision.notes && (
            <section className="bg-amber-50 p-6 rounded-xl border border-amber-100 mt-8">
              <h4 className="font-semibold text-amber-800 mb-2">หมายเหตุ:</h4>
              <p className="text-amber-700 text-sm">{decision.notes}</p>
            </section>
          )}
        </div>
      </div>
    </main>

    {/* Print Layout */}
    <div className="hidden print:block font-serif text-black bg-white max-w-[21cm] mx-auto p-8 leading-loose text-base">
      <div className="text-center font-bold text-xl mb-12">
        ฎีกาตัดสินเกี่ยวกับปัญหาข้อกฎหมาย
      </div>

      <div className="flex justify-between items-start mb-10">
        <div className="w-1/2">
          คำพิพากษาศาลฎีกาที่ {decision.decisionNumber}
        </div>
        <div className="w-1/2 text-right">
          {decision.parties && decision.parties.replace(/\s+(จำเลย|ผู้ร้อง|ผู้คัดค้าน|โจทก์ร่วม|จำเลยร่วม)\s*-/g, '\n$1 -').split('\n').filter(Boolean).map((part, i) => {
            let role = '';
            let name = part;
            
            // Handle format: "โจทก์ - นาย กมล สาลาสุตา"
            if (part.startsWith('โจทก์ -') || part.startsWith('โจทก์ร่วม -') || part.startsWith('จำเลย -') || part.startsWith('ผู้ร้อง -') || part.startsWith('ผู้คัดค้าน -')) {
              const splitIdx = part.indexOf('-');
              role = part.substring(0, splitIdx).trim();
              name = part.substring(splitIdx + 1).trim();
            } 
            // Handle format: "นาย กมล สาลาสุตา - โจทก์"
            else if (part.endsWith('- โจทก์') || part.endsWith('- โจทก์ร่วม') || part.endsWith('- จำเลย') || part.endsWith('- ผู้ร้อง') || part.endsWith('- ผู้คัดค้าน')) {
              const splitIdx = part.lastIndexOf('-');
              name = part.substring(0, splitIdx).trim();
              role = part.substring(splitIdx + 1).trim();
            }

            return (
              <div key={i} className="flex justify-between w-full pl-8 mb-1">
                <span className="text-left">{name}</span>
                <span className="text-right whitespace-nowrap ml-4">{role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {decision.law && (
        <div className="mb-8 text-justify">
          <LawLinkList lawText={decision.law} books={books} />
        </div>
      )}

      {decision.shortSummary && (
        <div className="mb-8 indent-16 text-justify">
          {decision.shortSummary.split('\n').map((paragraph, idx) => (
            <span key={idx}><TextWithLawLinks text={paragraph} books={books} /><br/></span>
          ))}
        </div>
      )}

      <div className="w-3/4 mx-auto border-t border-black my-8"></div>

      {decision.longSummary && (
        <div className="mb-10 indent-16 text-justify">
          {decision.longSummary.split('\n').map((paragraph, idx) => (
            <span key={idx}><TextWithLawLinks text={paragraph} books={books} /><br/></span>
          ))}
        </div>
      )}

      {decision.judge && (
        <div className="text-center mb-16">
          ({decision.judge})
        </div>
      )}

      <div className="grid grid-cols-[200px_1fr] gap-y-4">
        {decision.court && (
          <>
            <div>ศาลชั้นต้น/อุทธรณ์</div>
            <div>- {decision.court}</div>
          </>
        )}
        <div>แหล่งที่มา</div>
        <div>{decision.source || "กองผู้ช่วยผู้พิพากษาศาลฎีกา"}</div>
        
        {decision.department && (
          <>
            <div>แผนก</div>
            <div>{decision.department}</div>
          </>
        )}
        
        {decision.caseNumberLower && (
          <>
            <div>หมายเลขคดีแดงศาลชั้นต้น</div>
            <div>{decision.caseNumberLower}</div>
          </>
        )}
        
        {decision.notes && (
          <>
            <div>หมายเหตุ</div>
            <div>{decision.notes}</div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function DetailRow({ icon, label, value, fullWidth = false }: { icon: React.ReactNode, label: string, value: React.ReactNode, fullWidth?: boolean }) {
  return (
    <div className={`flex items-start gap-3 ${fullWidth ? 'col-span-1 md:col-span-2' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
        {React.cloneElement(icon as any, { className: "w-5 h-5" })}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-slate-800 font-medium">{value}</div>
      </div>
    </div>
  );
}
