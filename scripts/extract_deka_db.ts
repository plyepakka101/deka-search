import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to local Deka MySQL on port 3308...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: '',
    database: 'DEKA',
    charset: 'tis620'
  });

  console.log('Connected!');

  console.log('Fetching decisions...');
  const query = `
    SELECT 
      DKNUM, 
      DKYEAR, 
      S_TEXT, 
      L_TEXT,
      LITIGANT,
      JUDGE
    FROM PC_DOCUMENT
  `;

  console.log('Running query...');
  const [rows] = await connection.execute(query);
  const decisions = rows as any[];
  console.log(`Found ${decisions.length} decisions.`);

  console.log('\nProcessing and preparing inserts...');
  let importedCount = 0;
  let skippedCount = 0;

  const insertData: any[] = [];
  const uniqueKeys = new Set<string>();

  for (let i = 0; i < decisions.length; i++) {
    const row = decisions[i];
    
    const dkNum = row.DKNUM?.toString();
    const dkYear = row.DKYEAR?.toString();
    
    if (!dkNum || !dkYear) {
      skippedCount++;
      continue;
    }

    const decisionNumberStr = `${dkNum}/${dkYear}`;
    
    if (uniqueKeys.has(decisionNumberStr)) {
      skippedCount++;
      continue;
    }

    uniqueKeys.add(decisionNumberStr);

    const sText = row.S_TEXT?.trim();
    const lText = row.L_TEXT?.trim();
    const litigant = row.LITIGANT?.trim();
    const judge = row.JUDGE?.trim();
    
    if (!sText) {
      skippedCount++;
      continue;
    }

    insertData.push({
      decisionNumber: decisionNumberStr,
      decisionYear: parseInt(dkYear, 10),
      shortSummary: sText,
      longSummary: lText,
      parties: litigant || null,
      judge: judge || null,
    });
  }

  console.log(`Filtered down to ${insertData.length} unique inserts (skipped ${skippedCount} duplicate/bad rows).`);

  if (insertData.length > 0) {
    console.log('Fetching existing decisions to prevent duplicates...');
    const existing = await prisma.decision.findMany({
      select: { decisionNumber: true }
    });
    
    const existingKeys = new Set(existing.map(e => e.decisionNumber));
    
    const newInsertData = insertData.filter(d => !existingKeys.has(d.decisionNumber));

    console.log(`Inserting ${newInsertData.length} NEW records into Prisma in chunks of 5000...`);
    
    const chunkSize = 5000;
    for (let i = 0; i < newInsertData.length; i += chunkSize) {
      const chunk = newInsertData.slice(i, i + chunkSize);
      await prisma.decision.createMany({
        data: chunk
      });
      importedCount += chunk.length;
      process.stdout.write(`Inserted ${importedCount} / ${newInsertData.length}\r`);
    }
  }

  console.log(`\n\nSuccessfully completed! Imported ${importedCount} records.`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
