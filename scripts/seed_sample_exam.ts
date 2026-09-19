import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { parseExamText } from '../src/utils/examParser';

async function seed() {
  console.log('Reading sample exam file...');
  const filePath = path.join(__dirname, '../data/sample_bankruptcy_exam_q7.txt');
  const content = fs.readFileSync(filePath, 'utf-8');

  console.log('Parsing exam text...');
  const parsed = parseExamText(content, 'พระราชบัญญัติล้มละลาย พ.ศ. 2483', 'ข้อสอบเนติบัณฑิต ข้อ 7 (กฎหมายล้มละลายและการฟื้นฟูกิจการ)');

  console.log(`Parsed ${parsed.questions.length} questions.`);

  // Check if collection already exists
  const existing = await prisma.examCollection.findFirst({
    where: { title: parsed.title }
  });

  if (existing) {
    console.log('Collection already exists with ID:', existing.id);
    return;
  }

  const created = await prisma.examCollection.create({
    data: {
      title: parsed.title,
      category: parsed.category,
      year: parsed.year || 2545,
      description: 'ข้อสอบอัตนัยเนติบัณฑิต ข้อ 7 การฟื้นฟูกิจการและล้มละลาย',
      source: 'เนติบัณฑิตยสภา',
      questions: {
        create: parsed.questions.map(q => ({
          questionNumber: q.questionNumber,
          title: q.title,
          facts: q.facts,
          prompt: q.prompt,
          officialAnswer: q.officialAnswer,
          examDate: q.examDate || null,
          examYear: q.examYear || parsed.year || 2545,
          category: q.category,
          keyIssues: JSON.stringify(q.keyIssues || []),
          relatedSections: JSON.stringify(q.relatedSections || []),
          relatedDekas: JSON.stringify(q.relatedDekas || []),
        }))
      }
    },
    include: {
      questions: true
    }
  });

  console.log('Successfully created ExamCollection:', created.id, 'with', created.questions.length, 'questions!');
}

seed().then(() => {
  console.log('Done seeding sample exams.');
  process.exit(0);
}).catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
