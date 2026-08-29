"use client";

import React from 'react';
import LawHoverCard from './LawHoverCard';

type LawBookMeta = { id: string; name: string; abbreviation: string };

export default function LawLinkList({ lawText, books }: { lawText: string, books: LawBookMeta[] }) {
  if (!lawText) return null;

  // Build a map of all possible aliases for our books
  const aliases: { alias: string, bookId: string }[] = [];
  
  for (const book of books) {
    aliases.push({ alias: book.name, bookId: book.id });
    aliases.push({ alias: book.abbreviation, bookId: book.id });
    
    // Without dots (e.g. ป.อ. -> ปอ)
    const noDots = book.abbreviation.replace(/\./g, '');
    if (noDots !== book.abbreviation) {
      aliases.push({ alias: noDots, bookId: book.id });
    }
    
    // Missing trailing dot (e.g. ป.อ. -> ป.อ)
    if (book.abbreviation.endsWith('.')) {
      aliases.push({ alias: book.abbreviation.slice(0, -1), bookId: book.id });
    }
  }

  // Deduplicate and sort by length descending
  const uniqueAliases = Array.from(new Map(aliases.map(a => [a.alias, a])).values());
  uniqueAliases.sort((a, b) => b.alias.length - a.alias.length);

  // Format the text first: put abbreviations on new lines
  let formatted = lawText.replace(/\n/g, ' ').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');
  
  if (uniqueAliases.length > 0) {
    // Create a regex to match any of the aliases to put them on a new line
    const escapedAliases = uniqueAliases.map(a => a.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');
    const splitRegex = new RegExp(`\\s+(${escapedAliases})`, 'g');
    formatted = formatted.replace(splitRegex, '\n$1');
  }

  const lines = formatted.split('\n').filter(Boolean).map(l => l.trim());

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, idx) => {
        // Find which book this line belongs to by checking the first matched alias in the line
        // Since uniqueAliases is sorted by length, we match the most specific alias first
        const matchedAliasInfo = uniqueAliases.find(a => line.includes(a.alias));
        
        if (!matchedAliasInfo) {
          return <div key={idx} className="leading-relaxed">{line}</div>;
        }

        // If matched, parse the section numbers
        const parts = line.split(',');
        
        return (
          <div key={idx} className="leading-relaxed">
            {parts.map((part, pIdx) => {
              // Extract the number from the part
              const sectionSuffixes = 'ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ';
              const sectionRegex = new RegExp(`(?:มาตรา|ม\\.)?\\s*([๐-๙0-9]+(?:/[๐-๙0-9]+)?(?:\\s*(?:${sectionSuffixes}))?)`, 'g');
              
              let lastIndex = 0;
              let match;
              const subParts = [];
              
              // Find the first match to ensure it's valid
              let foundMatch = false;

              while ((match = sectionRegex.exec(part)) !== null) {
                const sectionNumStr = match[1];
                if (!sectionNumStr) continue;

                const sectionNum = sectionNumStr.trim();
                
                // Skip if it looks like a year (4 digits starting with 24 or 25)
                if (/^(24|25|๒๔|๒๕)[0-9๐-๙]{2}$/.test(sectionNum)) {
                   continue;
                }

                // Skip if it's matching the book abbreviation parts (e.g. 2499 inside a book name)
                // Actually since we already tokenized by comma, if it's just a raw number without "ม." it might be a year
                // if it's length 4, we skipped it above.

                foundMatch = true;

                if (match.index > lastIndex) {
                  subParts.push(<span key={`text-${lastIndex}`}>{part.substring(lastIndex, match.index)}</span>);
                }

                subParts.push(
                  <LawHoverCard
                    key={`link-${match.index}`}
                    bookId={matchedAliasInfo.bookId}
                    sectionNum={sectionNum}
                    matchText={match[0]}
                  />
                );
                
                lastIndex = sectionRegex.lastIndex;
              }

              if (!foundMatch) {
                return (
                  <React.Fragment key={pIdx}>
                    {part}{pIdx < parts.length - 1 ? ', ' : ''}
                  </React.Fragment>
                );
              }

              if (lastIndex < part.length) {
                subParts.push(<span key={`text-${lastIndex}`}>{part.substring(lastIndex)}</span>);
              }

              return (
                <React.Fragment key={pIdx}>
                  {subParts}
                  {pIdx < parts.length - 1 ? ', ' : ''}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
