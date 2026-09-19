const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.DATABASE_URL.split('/?')[0],
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Helper simple ID generator
function generateId() {
  return 'ex_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Simple parser for seed script
function parseSample(text) {
  const chunks = text.split(/(?:^|\n)(?=7\.[0-9]+\s+)/).filter(c => c.trim().length > 0);
  const questions = [];

  for (const chunk of chunks) {
    const parts = chunk.split(/(?:^|\n)\s*ธงคำตอบ\s*/);
    let qPart = parts[0] ? parts[0].trim() : '';
    let aPart = parts[1] ? parts[1].trim() : '';

    const numMatch = qPart.match(/^(?:คำถามข้อ\s*7\s*)?(7\.[0-9]+)/);
    const qNum = numMatch ? numMatch[1] : '7.1';

    const dateMatch = qPart.match(/\(([^)]*สอบ[^)]*)\)/);
    const examDate = dateMatch ? dateMatch[1].trim() : null;
    let examYear = null;
    if (examDate) {
      const yrMatch = examDate.match(/\b(25[0-9]{2})\b/);
      if (yrMatch) examYear = parseInt(yrMatch[1], 10);
    }

    let prompt = 'ให้วินิจฉัยข้อกฎหมายตามข้อเท็จจริงข้างต้น';
    let facts = qPart;
    const promptMatch = qPart.match(/(ให้วินิจฉัยว่า[\s\S]*?)(?:\([^\)]*สอบ[^\)]*\)|$)/);
    if (promptMatch) {
      prompt = promptMatch[1].trim();
      facts = qPart.substring(0, promptMatch.index).trim();
    }
    facts = facts.replace(/^(?:คำถามข้อ\s*7\s*)?7\.[0-9]+\s*/, '').trim();

    // Deka citations
    const dekaRegex = /(?:คำพิพากษาศาลฎีกาที่|เทียบคำพิพากษาศาลฎีกาที่|คำสั่งคำร้องศาลฎีกาที่|คำสั่งศาลฎีกาที่|ฎีกาที่)\s*([0-9]+(?:\s*[-–]\s*[0-9]+)?\s*[/]\s*[0-9]{4})/g;
    const relatedDekas = [];
    let dMatch;
    while ((dMatch = dekaRegex.exec(aPart)) !== null) {
      const dNum = dMatch[1].replace(/\s+/g, '');
      if (!relatedDekas.includes(dNum)) relatedDekas.push(dNum);
    }

    // Sections
    const secRegex = /(?:มาตรา|ม\.)\s*([0-9]+(?:[/][0-9]+)?(?:\s*(?:ทวิ|ตรี|จัตวา))?)/g;
    const relatedSections = [];
    let sMatch;
    while ((sMatch = secRegex.exec(aPart)) !== null) {
      const s = sMatch[1].trim();
      if (!relatedSections.some(r => r.section === s)) {
        relatedSections.push({ law: 'พ.ร.บ.ล้มละลาย', section: s, rawText: `มาตรา ${s}` });
      }
    }

    // Key issues
    const keyIssues = [
      'ประเมินหลักกฎหมายและการปรับใช้บทบัญญัติแห่งกฎหมายที่เกี่ยวข้อง',
      'ประเมินผลวินิจฉัยตามข้อเท็จจริงและคำพิพากษาศาลฎีกา'
    ];

    const firstLine = facts.split('\n')[0].trim();
    const title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;

    questions.push({
      questionNumber: qNum,
      title,
      facts,
      prompt,
      officialAnswer: aPart,
      examDate,
      examYear,
      category: 'พระราชบัญญัติล้มละลาย พ.ศ. 2483',
      keyIssues,
      relatedSections,
      relatedDekas
    });
  }

  return questions;
}

async function run() {
  console.log('Connecting to Turso...');
  const filePath = path.join(__dirname, '../data/sample_bankruptcy_exam_q7.txt');
  const content = fs.readFileSync(filePath, 'utf-8');

  const questions = parseSample(content);
  console.log(`Parsed ${questions.length} sample questions.`);

  const collectionId = generateId();
  const collectionTitle = 'ข้อสอบเนติบัณฑิต ข้อ 7 (กฎหมายล้มละลายและการฟื้นฟูกิจการ)';
  const category = 'พระราชบัญญัติล้มละลาย พ.ศ. 2483';

  // Check if collection already exists
  const existing = await client.execute({
    sql: 'SELECT id FROM ExamCollection WHERE title = ? LIMIT 1',
    args: [collectionTitle]
  });

  if (existing.rows.length > 0) {
    console.log('Collection already exists with ID:', existing.rows[0].id);
    return;
  }

  await client.execute({
    sql: `INSERT INTO ExamCollection (id, title, category, year, description, source, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [collectionId, collectionTitle, category, 2545, 'ข้อสอบอัตนัยเนติบัณฑิต ข้อ 7 การฟื้นฟูกิจการและล้มละลาย', 'เนติบัณฑิตยสภา']
  });

  console.log('Created collection:', collectionId);

  for (const q of questions) {
    const qId = generateId();
    await client.execute({
      sql: `INSERT INTO ExamQuestion (
              id, collectionId, questionNumber, title, facts, prompt, officialAnswer,
              examDate, examYear, category, keyIssues, relatedSections, relatedDekas,
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        qId,
        collectionId,
        q.questionNumber,
        q.title,
        q.facts,
        q.prompt,
        q.officialAnswer,
        q.examDate,
        q.examYear,
        q.category,
        JSON.stringify(q.keyIssues),
        JSON.stringify(q.relatedSections),
        JSON.stringify(q.relatedDekas)
      ]
    });
    console.log(`Inserted question ${q.questionNumber} (${qId})`);
  }

  console.log('Successfully seeded all sample exam questions to Turso!');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
