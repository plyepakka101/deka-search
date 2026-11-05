import React, { useMemo, useState } from 'react';
import { LawSection } from '../types';
import {
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  ArrowRightCircle,
  ListTree,
  Search,
  X,
  Layers,
  Bookmark,
  Folder,
  FolderOpen,
  FileText,
  ChevronsUpDown,
} from 'lucide-react';
import { thaiToArabic } from '../utils/textUtils';

interface TOCViewProps {
  laws: LawSection[];
  onNavigate: (id: string) => void;
}

interface TOCNode {
  label: string;
  level: number;
  firstLawId?: string;
  rangeText: string;
  sectionCount: number;
  children: TOCNode[];
  allLaws: LawSection[];
}

export const TOCView: React.FC<TOCViewProps> = ({ laws, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  // Build hierarchical tree with accurate section ranges and counts
  const tree = useMemo(() => {
    interface MutableTOCNode {
      label: string;
      level: number;
      childrenMap: Map<string, MutableTOCNode>;
      laws: LawSection[];
    }

    const rootMap = new Map<string, MutableTOCNode>();

    laws.forEach(law => {
      if (!law.category) return;

      const rawParts = law.category.split(' > ').map(p => p.trim()).filter(Boolean);
      // Strip book name prefix if it's the book itself
      const parts =
        rawParts.length > 1 && (rawParts[0] === law.bookId || rawParts[0].includes('ประมวล') || rawParts[0].includes('พระราชบัญญัติ'))
          ? rawParts.slice(1)
          : rawParts;

      if (parts.length === 0) return;

      let currentMap = rootMap;
      let currentNode: MutableTOCNode | undefined;

      parts.forEach((part, idx) => {
        if (!currentMap.has(part)) {
          currentMap.set(part, {
            label: part,
            level: idx,
            childrenMap: new Map(),
            laws: [],
          });
        }
        currentNode = currentMap.get(part)!;
        currentNode.laws.push(law);
        currentMap = currentNode.childrenMap;
      });
    });

    const finalizeNode = (mutable: MutableTOCNode): TOCNode => {
      const children = Array.from(mutable.childrenMap.values()).map(finalizeNode);
      const allLaws = mutable.laws;

      let firstSec = '';
      let lastSec = '';

      if (allLaws.length > 0) {
        firstSec = allLaws[0].sectionNumber.trim();
        lastSec = allLaws[allLaws.length - 1].sectionNumber.trim();
      }

      let rangeText = '';
      if (firstSec && lastSec) {
        rangeText = firstSec === lastSec ? `ม. ${firstSec}` : `ม. ${firstSec} - ${lastSec}`;
      }

      return {
        label: mutable.label,
        level: mutable.level,
        firstLawId: allLaws[0]?.id,
        rangeText,
        sectionCount: allLaws.length,
        children,
        allLaws,
      };
    };

    return Array.from(rootMap.values()).map(finalizeNode);
  }, [laws]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const q = searchQuery.toLowerCase().trim();
    const qArabic = thaiToArabic(q);

    const filterNode = (node: TOCNode): TOCNode | null => {
      const labelMatch = node.label.toLowerCase().includes(q) || thaiToArabic(node.label).includes(qArabic);
      const rangeMatch = node.rangeText.toLowerCase().includes(q) || thaiToArabic(node.rangeText).includes(qArabic);

      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is TOCNode => child !== null);

      if (labelMatch || rangeMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return tree.map(filterNode).filter((node): node is TOCNode => node !== null);
  }, [tree, searchQuery]);

  // Total sections across all branches
  const totalSectionsCount = useMemo(() => laws.length, [laws]);

  // Node Component for recursive rendering
  const NodeItem: React.FC<{ node: TOCNode }> = ({ node }) => {
    // Determine default expansion: expand root (level 0), or if expandAll is explicitly toggled, or if searching
    const [isExpanded, setIsExpanded] = useState(() => {
      if (expandAll !== null) return expandAll;
      if (searchQuery.trim()) return true;
      return node.level === 0;
    });

    // Sync with global expand/collapse toggle or search
    React.useEffect(() => {
      if (expandAll !== null) {
        setIsExpanded(expandAll);
      } else if (searchQuery.trim()) {
        setIsExpanded(true);
      }
    }, [expandAll, searchQuery]);

    const hasChildren = node.children.length > 0;
    const canNavigate = !!node.firstLawId;

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        setIsExpanded(!isExpanded);
      } else if (canNavigate) {
        onNavigate(node.firstLawId!);
      }
    };

    const handleNavigate = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.firstLawId) onNavigate(node.firstLawId);
    };

    // Level 0: Top-level ภาค / บรรพ (Card style with rich header)
    if (node.level === 0) {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden mb-4 transition-all hover:shadow-md">
          <div
            onClick={handleToggle}
            className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:from-indigo-100/80 dark:hover:from-indigo-900/50 transition-colors"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs flex-shrink-0 flex items-center justify-center">
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                ) : (
                  <Layers size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg break-words leading-tight">
                    {node.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {node.rangeText && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {node.rangeText}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {node.sectionCount} มาตรา
                  </span>
                </div>
              </div>
            </div>

            {canNavigate && (
              <button
                type="button"
                onClick={handleNavigate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex-shrink-0 cursor-pointer active:scale-95"
                title="ไปที่มาตราแรกของส่วนนี้"
              >
                <span>เปิดดู</span>
                <ArrowRightCircle size={15} />
              </button>
            )}
          </div>

          {isExpanded && hasChildren && (
            <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 divide-y divide-slate-100 dark:divide-slate-800/60">
              {node.children.map((child, idx) => (
                <NodeItem key={`${child.label}-${idx}`} node={child} />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Level 1: ลักษณะ / หมวดหลัก
    // Level 2: หมวด / ส่วนที่
    // Level 3+: ข้อย่อย
    const indentPadding =
      node.level === 1 ? 'pl-5 sm:pl-7' : node.level === 2 ? 'pl-9 sm:pl-12' : 'pl-12 sm:pl-16';

    const getLevelIcon = () => {
      if (node.level === 1) return <Bookmark size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />;
      if (node.level === 2) return <Folder size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />;
      return <CornerDownRight size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />;
    };

    return (
      <div className="transition-colors">
        <div
          onClick={handleToggle}
          className={`
            flex items-center justify-between py-3 pr-4 cursor-pointer transition-colors
            ${indentPadding}
            hover:bg-slate-50 dark:hover:bg-slate-800/60
            ${node.level === 1 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-900/40'}
          `}
        >
          <div className="flex items-start gap-2.5 overflow-hidden flex-1 min-w-0 pr-3">
            {hasChildren ? (
              <span
                className={`text-slate-400 hover:text-indigo-600 dark:text-slate-500 transition-transform duration-200 mt-0.5 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              >
                <ChevronRight size={15} />
              </span>
            ) : (
              <span className="w-3.5" />
            )}

            {getLevelIcon()}

            <div className="min-w-0 flex-1">
              <span
                className={`break-words leading-snug block ${
                  node.level === 1
                    ? 'font-semibold text-slate-800 dark:text-slate-200 text-sm'
                    : 'text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium'
                }`}
              >
                {node.label}
              </span>

              <div className="flex items-center gap-2 mt-0.5">
                {node.rangeText && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {node.rangeText}
                  </span>
                )}
                {node.sectionCount > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    ({node.sectionCount} มาตรา)
                  </span>
                )}
              </div>
            </div>
          </div>

          {canNavigate && (
            <button
              type="button"
              onClick={handleNavigate}
              className="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors ml-2 flex-shrink-0 cursor-pointer"
              title={`ไปที่ ${node.rangeText || node.label}`}
            >
              <ArrowRightCircle size={17} />
            </button>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="divide-y divide-slate-100/70 dark:divide-slate-800/40">
            {node.children.map((child, idx) => (
              <NodeItem key={`${child.label}-${idx}`} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 px-2 sm:px-0">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2.5 text-slate-900 dark:text-white">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <ListTree size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">สารบัญโครงสร้างกฎหมาย</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เลือกดูตาม ภาค &gt; ลักษณะ &gt; หมวด พร้อมระบุช่วงมาตราและกระโดดไปอ่านได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpandAll(prev => (prev === true ? false : true))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs"
            >
              <ChevronsUpDown size={14} />
              <span>{expandAll === true ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar in TOC */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setExpandAll(null); // allow query to drive expansion
            }}
            placeholder="ค้นหาในสารบัญ (เช่น บทนิยาม, ลักทรัพย์, อายุความ, ม. 288)..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Statistics badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span>รวมทั้งสิ้น {totalSectionsCount} มาตรา</span>
          {searchQuery && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              แสดงเฉพาะหมวดที่ตรงกับ &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Tree Content */}
      {filteredTree.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-base mb-1">ไม่พบหมวดหมู่ที่ตรงกับการค้นหา</p>
          <p className="text-xs">ลองค้นหาด้วยคำอื่น หรือกดล้างคำค้นหา</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTree.map((node, index) => (
            <NodeItem key={`${node.label}-${index}`} node={node} />
          ))}
        </div>
      )}
    </div>
  );
};
