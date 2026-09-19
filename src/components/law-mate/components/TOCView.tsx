
import React, { useMemo, useState } from 'react';
import { LawSection } from '../types';
import { ChevronRight, ChevronDown, FileText, CornerDownRight, ArrowRightCircle, ListTree } from 'lucide-react';

interface TOCViewProps {
  laws: LawSection[];
  onNavigate: (id: string) => void;
}

interface TOCNode {
  label: string;
  id?: string; // ID of the first section in this group
  children: TOCNode[];
  level: number;
}

export const TOCView: React.FC<TOCViewProps> = ({ laws, onNavigate }) => {
  
  const tree = useMemo(() => {
    const root: TOCNode[] = [];
    
    laws.forEach(law => {
      if (!law.category) return;
      
      const parts = law.category.split(' > ');
      let currentLevel = root;
      
      // Build hierarchy from category parts
      parts.forEach((part, index) => {
        let existingNode = currentLevel.find(n => n.label === part);
        if (!existingNode) {
          existingNode = {
            label: part,
            children: [],
            level: index,
            // Point to this law if it's the specific category leaf
            id: index === parts.length - 1 ? law.id : undefined 
          };
          currentLevel.push(existingNode);
        } else if (index === parts.length - 1 && !existingNode.id) {
           // If we found the node but it didn't have an ID yet (maybe it was created as a parent previously),
           // assign the ID now because it's also a leaf for this specific law.
           existingNode.id = law.id;
        }
        currentLevel = existingNode.children;
      });
    });

    return root;
  }, [laws]);

  // Recursive render component
  const NodeItem: React.FC<{ node: TOCNode }> = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(node.level === 0); // Auto-expand root level
    const hasChildren = node.children.length > 0;
    const isClickable = !!node.id;

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        setIsExpanded(!isExpanded);
      } else if (isClickable) {
          onNavigate(node.id!);
      }
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.id) onNavigate(node.id);
    };

    // Level 0: Root Cards (Part/Book)
    if (node.level === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden mb-4 transition-all hover:shadow-xs">
                <div 
                    onClick={handleToggle}
                    className="bg-indigo-50/40 dark:bg-indigo-950/20 p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-900/30 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-2xs flex-shrink-0">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-base break-words leading-tight">{node.label}</span>
                    </div>
                    {isClickable && (
                         <button 
                            onClick={handleNavigate}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1 ml-2 flex-shrink-0"
                            title="ไปที่ส่วนนี้"
                         >
                             <ArrowRightCircle size={20} />
                         </button>
                    )}
                </div>
                {isExpanded && hasChildren && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        {node.children.map((child, idx) => (
                            <NodeItem key={`${child.label}-${idx}`} node={child} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Level 1+: Nested Items
    const paddingLeft = node.level === 1 ? 'pl-4' : node.level === 2 ? 'pl-8' : 'pl-12';
    
    return (
      <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div 
          onClick={handleToggle}
          className={`
            flex items-center justify-between py-3 pr-4 cursor-pointer transition-colors
            ${paddingLeft}
            ${node.level === 1 ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
            ${isClickable ? '' : ''}
          `}
        >
          <div className="flex items-start gap-2 overflow-hidden">
            {hasChildren && (
               <span className={`text-slate-400 transition-transform duration-200 mt-0.5 ${isExpanded ? 'rotate-90' : ''}`}>
                   <ChevronRight size={14} />
               </span>
            )}
            {!hasChildren && node.level > 1 && (
                <CornerDownRight size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1.5" />
            )}
            
            <span className={`break-words leading-snug ${node.level === 1 ? 'font-semibold text-slate-800 dark:text-slate-200 text-sm' : 'text-xs text-slate-700 dark:text-slate-300'}`}>
              {node.label}
            </span>
          </div>

          {isClickable && (
              <button 
                onClick={handleNavigate}
                className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors ml-2 flex-shrink-0"
              >
                  <ArrowRightCircle size={16} />
              </button>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="">
            {node.children.map((child, idx) => (
              <NodeItem key={`${child.label}-${idx}`} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between px-2 mb-6">
         <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <ListTree size={22} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold">สารบัญกฎหมาย</h2>
         </div>
         <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
            โครงสร้างมาตรา
         </div>
      </div>
      
      <div className="space-y-4">
        {tree.map((node, index) => (
            <NodeItem key={`${node.label}-${index}`} node={node} />
        ))}
      </div>
    </div>
  );
};
