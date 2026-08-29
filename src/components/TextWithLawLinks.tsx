import React from 'react';
import LawHoverCard from './LawHoverCard';

type LawBookMeta = { id: string; name: string; abbreviation: string };

export function TextWithLawLinks({ text, books }: { text: string, books: LawBookMeta[] }) {
  if (!text) return <>{text}</>;

  // Build a map of all possible aliases for our books
  // Sort them by length descending so longer matches (like full names) take precedence over short ones
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

  // Deduplicate and sort
  const uniqueAliases = Array.from(new Map(aliases.map(a => [a.alias, a])).values());
  uniqueAliases.sort((a, b) => b.alias.length - a.alias.length);

  // Build regex: (alias1|alias2|...) (มาตรา|ม.) (numbers with optional suffixes like /1 or ทวิ)
  const escapedAliases = uniqueAliases.map(a => a.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');
  
  // Regex parts:
  // 1: The law alias
  // 2: Optional space
  // 3: "มาตรา" or "ม." with optional space
  // 4: Section numbers (comma separated or "และ" or just single number) 
  // Actually parsing comma-separated sections inside regex is hard.
  // Instead, let's just match the start (law alias + มาตรา + first number), and we can process comma separated later,
  // but for TextWithLawLinks which is inline text, usually it's "ป.อ. มาตรา 193"
  // Let's use a robust regex for a single section match.
  const sectionSuffixes = 'ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ';
  const baseRegex = new RegExp(`(${escapedAliases})\\s*(?:มาตรา|ม\\.)\\s*([๐-๙0-9]+(?:/[๐-๙0-9]+)?(?:\\s*(?:${sectionSuffixes}))?)`, 'g');

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = baseRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }

    const matchedAlias = match[1];
    const firstSectionNum = match[2].trim();
    const book = uniqueAliases.find(a => a.alias === matchedAlias);

    if (book) {
      parts.push(
        <LawHoverCard
          key={`link-${match.index}`}
          bookId={book.bookId}
          sectionNum={firstSectionNum}
          matchText={match[0]}
        />
      );

      let currentIdx = baseRegex.lastIndex;
      const subsequentRegex = new RegExp(`^(?:\\s*(?:,|และ|หรือ|ถึง|\\-)\\s*|\\s+)([๐-๙0-9]+(?:/[๐-๙0-9]+)?(?:\\s*(?:${sectionSuffixes}))?)`);
      
      let subMatch;
      while ((subMatch = subsequentRegex.exec(text.substring(currentIdx))) !== null) {
        // Skip if it looks like a year (e.g., 2565) and not explicitly marked with "มาตรา"
        // Since we are parsing just numbers after a comma, 4 digit numbers starting with 24/25 are highly likely years
        if (/^(24|25|๒๔|๒๕)[0-9๐-๙]{2}$/.test(subMatch[1].trim())) {
          break; // Stop parsing subsequent numbers if we hit a year
        }

        const separator = subMatch[0].substring(0, subMatch[0].length - subMatch[1].length);
        const nextSectionNum = subMatch[1].trim();

        parts.push(<span key={`sep-${currentIdx}`}>{separator}</span>);
        parts.push(
          <LawHoverCard
            key={`link-sub-${currentIdx}`}
            bookId={book.bookId}
            sectionNum={nextSectionNum}
            matchText={nextSectionNum}
          />
        );

        currentIdx += subMatch[0].length;
      }
      
      baseRegex.lastIndex = currentIdx;
      lastIndex = currentIdx;

    } else {
      parts.push(<span key={`raw-${match.index}`}>{match[0]}</span>);
      lastIndex = baseRegex.lastIndex;
    }
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return <>{parts.length > 0 ? parts : text}</>;
}
