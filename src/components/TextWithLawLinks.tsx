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

    // Without spaces (e.g. "พ.ร.บ. ล้มละลาย" -> "พ.ร.บ.ล้มละลาย")
    const noSpacesAbbr = book.abbreviation.replace(/\s+/g, '');
    if (noSpacesAbbr !== book.abbreviation) {
      aliases.push({ alias: noSpacesAbbr, bookId: book.id });
    }
    const noSpacesName = book.name.replace(/\s+/g, '');
    if (noSpacesName !== book.name) {
      aliases.push({ alias: noSpacesName, bookId: book.id });
    }
    
    // Without dots (e.g. ป.อ. -> ปอ, พ.ร.บ.ล้มละลาย -> พรบล้มละลาย)
    const noDots = book.abbreviation.replace(/\./g, '');
    if (noDots !== book.abbreviation) {
      aliases.push({ alias: noDots, bookId: book.id });
      aliases.push({ alias: noDots.replace(/\s+/g, ''), bookId: book.id });
    }
    
    // Missing trailing dot (e.g. ป.อ. -> ป.อ)
    if (book.abbreviation.endsWith('.')) {
      aliases.push({ alias: book.abbreviation.slice(0, -1), bookId: book.id });
    }

    // Variations with ฯ (e.g. พ.ร.บ.ล้มละลายฯ)
    aliases.push({ alias: `${noSpacesAbbr}ฯ`, bookId: book.id });
    aliases.push({ alias: `${book.abbreviation}ฯ`, bookId: book.id });
    aliases.push({ alias: `${book.name}ฯ`, bookId: book.id });
  }

  // Explicit aliases for Bankruptcy Act
  const bkBook = books.find(b => b.id === 'bankruptcy');
  if (bkBook) {
    aliases.push({ alias: 'พ.ร.บ.ล้มละลาย', bookId: 'bankruptcy' });
    aliases.push({ alias: 'พ.ร.บ. ล้มละลาย', bookId: 'bankruptcy' });
    aliases.push({ alias: 'พระราชบัญญัติล้มละลาย', bookId: 'bankruptcy' });
    aliases.push({ alias: 'พรบล้มละลาย', bookId: 'bankruptcy' });
  }

  // Deduplicate and sort
  const uniqueAliases = Array.from(new Map(aliases.map(a => [a.alias, a])).values());
  uniqueAliases.sort((a, b) => b.alias.length - a.alias.length);

  // Build regex: (alias1|alias2|...) (มาตรา|ม.) (numbers with optional suffixes like /1 or ทวิ)
  const escapedAliases = uniqueAliases.map(a => a.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');
  
  // Section suffixes including อัฏฐ and อัฎฐ
  const sectionSuffixes = 'ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ';

  // Base regex matches:
  // 1) Law name + optional (ฯ / พ.ศ. 2483 / พุทธศักราช ๒๔๘๓) + มาตรา/ม. + Section number
  // 2) Standalone Bankruptcy Section 90/... (e.g. "มาตรา 90/42 ทวิ") which only exists in Bankruptcy Act
  const baseRegex = new RegExp(
    `(?:(${escapedAliases})(?:\\s*ฯ)?(?:\\s*(?:พ\\.ศ\\.|พุทธศักราช)?\\s*[๐-๙0-9]{4})?\\s*(?:มาตรา|ม\\.)\\s*([๐-๙0-9]+(?:/[๐-๙0-9]+)?(?:\\s*(?:${sectionSuffixes}))?))|` +
    `(?:(?<![ก-๙a-zA-Z0-9])(?:มาตรา|ม\\.)\\s*(90/[๐-๙0-9]+(?:\\s*(?:${sectionSuffixes}))?))`,
    'g'
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = baseRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }

    const matchedAlias = match[1];
    const firstSectionNum = match[2] ? match[2].trim() : (match[3] ? match[3].trim() : '');
    const book = matchedAlias ? uniqueAliases.find(a => a.alias === matchedAlias) : null;
    const targetBookId = book ? book.bookId : (bkBook ? bkBook.id : 'bankruptcy');

    if ((book || bkBook) && firstSectionNum) {
      parts.push(
        <LawHoverCard
          key={`link-${match.index}`}
          bookId={targetBookId}
          sectionNum={firstSectionNum}
          matchText={match[0]}
        />
      );

      let currentIdx = baseRegex.lastIndex;
      const subsequentRegex = new RegExp(`^(?:\\s*(?:,|และ|หรือ|ถึง|\\-)\\s*|\\s+)([๐-๙0-9]+(?:/[๐-๙0-9]+)?(?:\\s*(?:${sectionSuffixes}))?)`);
      
      let subMatch;
      while ((subMatch = subsequentRegex.exec(text.substring(currentIdx))) !== null) {
        // Skip if it looks like a year (e.g., 2565) and not explicitly marked with "มาตรา"
        if (/^(24|25|๒๔|๒๕)[0-9๐-๙]{2}$/.test(subMatch[1].trim())) {
          break; // Stop parsing subsequent numbers if we hit a year
        }

        const separator = subMatch[0].substring(0, subMatch[0].length - subMatch[1].length);
        const nextSectionNum = subMatch[1].trim();

        parts.push(<span key={`sep-${currentIdx}`}>{separator}</span>);
        parts.push(
          <LawHoverCard
            key={`link-sub-${currentIdx}`}
            bookId={targetBookId}
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
