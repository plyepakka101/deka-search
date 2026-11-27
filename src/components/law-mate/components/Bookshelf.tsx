
import React, { useState } from 'react';
import { LawBook, LawSection } from '../types';
import { Book, ChevronRight, Library, Brain, RotateCw } from 'lucide-react';
import { getLocalItems } from '../services/memorizeService';
import { initLawsData } from '../services/dataService';

interface BookshelfProps {
  books: LawBook[];
  laws: LawSection[];
  onSelectBook: (bookId: string) => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({ books, laws, onSelectBook }) => {
  const memoItems = getLocalItems();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await initLawsData(true);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getLawCount = (bookId: string) => {
    return laws.filter(l => l.bookId === bookId).length;
  };

  const getMemoCount = (bookId: string) => {
    return memoItems.filter(i => i.bookId === bookId || i.deckId === `deck-${bookId}` || i.sectionId.startsWith(`${bookId}-`)).length;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center justify-center mb-6 md:mb-10">
         <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 mb-3">
            <Library size={44} className="text-indigo-600 dark:text-indigo-400" />
         </div>
         <button
           onClick={handleRefresh}
           disabled={isRefreshing}
           className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-50"
           title="ซิงค์และตรวจสอบกฎหมายใหม่จากฐานข้อมูล"
         >
           <RotateCw size={12} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
           <span>{isRefreshing ? "กำลังซิงค์ข้อมูล..." : "ซิงค์ตัวบทล่าสุด"}</span>
         </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 px-2">
        {books.map((book) => {
          const count = getLawCount(book.id);
          const isHex = book.color?.startsWith('#');
          const colorClass = isHex ? '' : (book.color || 'bg-slate-500');
          const colorStyle = isHex ? { backgroundColor: book.color } : {};
          
          return (
            <button
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              className="relative group flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xs hover:shadow-md border border-slate-200/80 dark:border-slate-800 transition-all duration-300 overflow-hidden text-left h-full transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className={`h-2 w-full ${colorClass}`} style={colorStyle} />
              
              <div className="p-6 flex-1 flex flex-row items-start space-x-4">
                 <div className={`w-12 h-16 rounded-xl shadow-xs flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${colorClass} bg-opacity-90`} style={colorStyle}>
                    <span className="transform -rotate-90 whitespace-nowrap">{book.abbreviation}</span>
                 </div>
                 
                 <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 font-sans group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {book.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-sans leading-relaxed">
                        {book.description}
                    </p>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
                        <span className="flex items-center">
                          <Book size={12} className="mr-1" />
                          <span>{count} มาตรา</span>
                        </span>
                        {getMemoCount(book.id) > 0 && (
                          <span className="flex items-center text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-800/50">
                            <Brain size={11} className="mr-1 text-purple-600 dark:text-purple-400" />
                            <span>{getMemoCount(book.id)} ในชุดท่อง</span>
                          </span>
                        )}
                    </div>
                 </div>
                 
                 <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight size={22} />
                 </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
