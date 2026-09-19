export const EXAM_CATEGORIES = [
  "ประมวลกฎหมายแพ่งและพาณิชย์",
  "ประมวลกฎหมายอาญา",
  "ประมวลกฎหมายวิธีพิจารณาความแพ่ง",
  "ประมวลกฎหมายวิธีพิจารณาความอาญา",
  "พระธรรมนูญศาลยุติธรรม",
  "พระราชบัญญัติล้มละลาย พ.ศ. 2483",
  "รัฐธรรมนูญแห่งราชอาณาจักรไทย",
  "พยานแพ่ง",
  "พยานอาญา",
] as const;

export type ExamCategory = typeof EXAM_CATEGORIES[number];

export interface ParsedExamQuestion {
  questionNumber: string;
  title: string;
  facts: string;
  prompt: string;
  officialAnswer: string;
  examDate?: string;
  examYear?: number;
  category: string;
  keyIssues: string[];
  relatedSections: { law?: string; section: string; rawText: string }[];
  relatedDekas: string[];
}

export interface ParsedExamCollection {
  title: string;
  category: string;
  year?: number;
  description?: string;
  source?: string;
  questions: ParsedExamQuestion[];
}

/**
 * Normalizes Thai digits to Arabic digits
 */
export function thaiDigitsToArabic(str: string): string {
  const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return str.replace(/[๐-๙]/g, (ch) => thaiNumerals.indexOf(ch).toString());
}

/**
 * Extracts cited Supreme Court decisions (e.g. "5744/2531", "5597-5598/2545")
 */
export function extractDekaCitations(text: string): string[] {
  const normalized = thaiDigitsToArabic(text);
  const regex = /(?:คำพิพากษาศาลฎีกาที่|เทียบคำพิพากษาศาลฎีกาที่|คำสั่งคำร้องศาลฎีกาที่|คำสั่งศาลฎีกาที่|ฎีกาที่)\s*([0-9]+(?:\s*[-–]\s*[0-9]+)?\s*[/]\s*[0-9]{4})/g;
  
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    let dekaNum = match[1].replace(/\s+/g, '');
    if (!matches.includes(dekaNum)) {
      matches.push(dekaNum);
    }
  }

  // Also catch simple patterns like "5744/2531" in parentheses if preceded by law context
  const parenRegex = /\(([0-9]+(?:\s*[-–]\s*[0-9]+)?\s*[/]\s*25[0-9]{2})\)/g;
  while ((match = parenRegex.exec(normalized)) !== null) {
    let dekaNum = match[1].replace(/\s+/g, '');
    if (!matches.includes(dekaNum)) {
      matches.push(dekaNum);
    }
  }

  return matches;
}

/**
 * Extracts cited law sections
 */
export function extractSectionCitations(text: string): { law?: string; section: string; rawText: string }[] {
  const normalized = thaiDigitsToArabic(text);
  const results: { law?: string; section: string; rawText: string }[] = [];

  // Match pattern: "มาตรา 90/12 (9)" or "มาตรา 6, 95"
  const secRegex = /(?:มาตรา|ม\.)\s*([0-9]+(?:[/][0-9]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?(?:\s*(?:วรรค|อนุ|วงเล็บ|\([0-9]+\)|[0-9]+))*)/g;
  
  let match;
  while ((match = secRegex.exec(normalized)) !== null) {
    const rawSection = match[1].trim();
    // find surrounding law if nearby
    const surroundingStart = Math.max(0, match.index - 50);
    const surrounding = text.substring(surroundingStart, match.index);
    let lawFound: string | undefined = undefined;

    if (surrounding.includes('ล้มละลาย')) lawFound = 'พ.ร.บ.ล้มละลาย';
    else if (surrounding.includes('วิธีพิจารณาความแพ่ง') || surrounding.includes('วิ.แพ่ง')) lawFound = 'ป.วิ.พ.';
    else if (surrounding.includes('วิธีพิจารณาความอาญา') || surrounding.includes('วิ.อาญา')) lawFound = 'ป.วิ.อ.';
    else if (surrounding.includes('แพ่งและพาณิชย์') || surrounding.includes('ป.พ.พ.')) lawFound = 'ป.พ.พ.';
    else if (surrounding.includes('อาญา') || surrounding.includes('ป.อ.')) lawFound = 'ป.อ.';
    else if (surrounding.includes('รัฐธรรมนูญ')) lawFound = 'รัฐธรรมนูญ';
    else if (surrounding.includes('พระธรรมนูญศาล')) lawFound = 'พระธรรมนูญศาลยุติธรรม';

    const cleanSec = rawSection.split(/[\s,]+/)[0];
    if (cleanSec && !results.some(r => r.section === cleanSec && r.law === lawFound)) {
      results.push({
        law: lawFound,
        section: cleanSec,
        rawText: `มาตรา ${rawSection}`
      });
    }
  }

  return results;
}

/**
 * Extracts key issues (ประเด็นข้อกฎหมาย) from answer for Self-Evaluation checklist
 */
export function extractKeyIssues(answer: string): string[] {
  const issues: string[] = [];
  
  // 1. Check for sub-points like (ก), (ข), (ค) or (1), (2), (3)
  const subPoints = answer.split(/(?=(?:^|\n)\s*(?:\([ก-ฮa-z0-9]+\)|\d+\.))/g);
  if (subPoints.length > 1) {
    for (const p of subPoints) {
      const clean = p.trim();
      if (clean.length > 10) {
        // take first sentence or up to 120 chars
        const firstSentence = clean.split('\n')[0].replace(/^\([ก-ฮa-z0-9]+\)\s*/, '');
        issues.push(firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence);
      }
    }
  }

  // 2. If no subpoints, split by paragraphs or major concluding statements
  if (issues.length === 0) {
    const paragraphs = answer.split('\n').map(p => p.trim()).filter(p => p.length > 20);
    for (const para of paragraphs.slice(0, 4)) {
      const summary = para.length > 110 ? para.substring(0, 107) + '...' : para;
      issues.push(summary);
    }
  }

  // Fallback if still empty
  if (issues.length === 0 && answer.trim()) {
    issues.push('วินิจฉัยหลักกฎหมายและผลทางคดีตามข้อเท็จจริง');
  }

  return issues;
}

/**
 * Main parser function: parses raw exam text into a collection of questions
 */
export function parseExamText(
  rawText: string, 
  defaultCategory: string = "พระราชบัญญัติล้มละลาย พ.ศ. 2483",
  collectionTitleHint: string = ""
): ParsedExamCollection {
  const normalized = thaiDigitsToArabic(rawText).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // Detect main title
  let title = collectionTitleHint.trim();
  if (!title) {
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('คำถามข้อ') || trimmed.startsWith('ข้อสอบ')) {
        title = trimmed;
        break;
      }
    }
  }
  if (!title) {
    title = `ชุดข้อสอบ ${defaultCategory}`;
  }

  // Split questions based on patterns like "7.1 ", "7.2 ", "ข้อ 1", "ข้อ 7"
  // Look for question delimiters
  const questionSplits: { header: string; content: string }[] = [];
  
  // Regex matches start of question e.g. "7.1 ", "ข้อ 7.1", "คำถามข้อ 7\n7.1"
  const regexQuestionStart = /(?:^|\n)(?:(?:คำถามข้อ\s*[0-9]+(?:\.[0-9]+)?)|(?:ข้อ\s*[0-9]+(?:\.[0-9]+)?)|(?:[0-9]+\.[0-9]+))\s+/g;
  
  const matches: { index: number; text: string }[] = [];
  let m;
  while ((m = regexQuestionStart.exec(normalized)) !== null) {
    matches.push({ index: m.index, text: m[0].trim() });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const startIdx = matches[i].index;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
      const chunk = normalized.substring(startIdx, endIdx).trim();
      questionSplits.push({
        header: matches[i].text,
        content: chunk
      });
    }
  } else {
    // If no numbered pattern found, treat the whole text as 1 question
    questionSplits.push({
      header: '1',
      content: normalized
    });
  }

  const questions: ParsedExamQuestion[] = [];
  let detectedYear: number | undefined = undefined;

  for (const item of questionSplits) {
    const chunk = item.content;
    
    // Split into question vs answer using "ธงคำตอบ" or "แนวคำตอบ" or "คำตอบ"
    const answerMarkerRegex = /(?:^|\n)\s*(?:ธงคำตอบ|แนวคำตอบ|คำตอบ)\s*[:\-—]?\s*/;
    const parts = chunk.split(answerMarkerRegex);

    let questionPart = parts[0]?.trim() || '';
    let answerPart = parts.length > 1 ? parts.slice(1).join('\nธงคำตอบ ').trim() : '';

    // Extract Question Number (e.g. "7.1", "7.2")
    let qNum = item.header.replace(/^(?:คำถามข้อ|ข้อ)\s*/, '').trim();
    const subNumMatch = chunk.match(/(?:^|\n)\s*([0-9]+\.[0-9]+)\s+/);
    if (subNumMatch) {
      qNum = subNumMatch[1];
    } else if (!qNum || qNum === '1') {
      const firstNumMatch = questionPart.match(/^([0-9]+(?:\.[0-9]+)?)/);
      if (firstNumMatch) {
        qNum = firstNumMatch[1];
      }
    }

    // Extract exam date & year from parenthesis at the end of question or answer
    // e.g. "(ข้อสอบวันอาทิตย์ที่ 2 มิถุนายน 2545)"
    let examDate: string | undefined = undefined;
    let examYear: number | undefined = undefined;

    const dateMatch = questionPart.match(/\(([^)]*สอบ[^)]*)\)/);
    if (dateMatch) {
      examDate = dateMatch[1].trim();
      const yearMatch = examDate.match(/\b(25[0-9]{2})\b/);
      if (yearMatch) {
        examYear = parseInt(yearMatch[1], 10);
        if (!detectedYear) detectedYear = examYear;
      }
    }

    // Extract Prompt ("ให้วินิจฉัยว่า...")
    let prompt = '';
    let facts = questionPart;

    const promptMatch = questionPart.match(/(ให้วินิจฉัยว่า[\s\S]*?)(?:\([^\)]*สอบ[^\)]*\)|$)/);
    if (promptMatch) {
      prompt = promptMatch[1].trim();
      facts = questionPart.substring(0, promptMatch.index).trim();
    } else {
      prompt = 'ให้วินิจฉัยข้อกฎหมายตามข้อเท็จจริงข้างต้น';
    }

    // Clean up facts: remove leading headers e.g. "คำถามข้อ 7", "7.1"
    facts = facts
      .replace(/^คำถามข้อ\s*[0-9]+(?:\.[0-9]+)?\s*/i, '')
      .replace(/^[0-9]+\.[0-9]+\s*/, '')
      .replace(/^ข้อ\s*[0-9]+(?:\.[0-9]+)?\s*/i, '')
      .trim();

    // Citations & Issues
    const relatedDekas = extractDekaCitations(answerPart);
    const relatedSections = extractSectionCitations(answerPart);
    const keyIssues = extractKeyIssues(answerPart);

    // Create a concise title
    let questionTitle = '';
    if (facts) {
      const firstLine = facts.split('\n')[0].trim();
      questionTitle = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
    }

    questions.push({
      questionNumber: qNum || `ข้อ ${questions.length + 1}`,
      title: questionTitle,
      facts,
      prompt,
      officialAnswer: answerPart,
      examDate,
      examYear,
      category: defaultCategory,
      keyIssues,
      relatedSections,
      relatedDekas
    });
  }

  return {
    title,
    category: defaultCategory,
    year: detectedYear,
    questions
  };
}
