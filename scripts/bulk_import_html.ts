import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { prisma } from '../src/lib/prisma';
const IMPORT_DIR = path.join(process.cwd(), 'to_import');

// Helper to extract decision year and number
function parseDecisionNumber(text: string) {
  const match = text.match(/คำพิพากษาศาลฎีกาที่\s*([0-9๐-๙]+)\s*\/\s*([0-9๐-๙]+)/);
  if (match && match.index !== undefined && match.index < 30) {
    const num = match[1];
    const yearStr = match[2];
    let year = parseInt(yearStr);
    if (year < 2400 && year > 0) year += 2500; // Just in case it's 2-digit
    return { decisionNumber: `${num}/${year}`, decisionYear: year };
  }
  return null;
}

async function processFile(filePath: string, existingKeys: Set<string>): Promise<any[]> {
  try {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent);
    const inserts: any[] = [];
    
    // The structure usually has "คำพิพากษาศาลฎีกาที่" as a bold text or label
    const decisionNodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
      return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
    });

    for (let i = 0; i < decisionNodes.length; i++) {
      const node = $(decisionNodes[i]);
      const rawTitle = node.text().trim();
      const parsed = parseDecisionNumber(rawTitle);
      if (!parsed) continue;

      const { decisionNumber, decisionYear } = parsed;
      if (existingKeys.has(decisionNumber)) continue;

      let container: any = node.closest('table, tbody, li, tr').parent(); 
      if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
         container = node.closest('table');
      }
      if (container.length === 0) {
         container = node.parent().parent();
      }

      // Try multiple selectors just in case
      let shortSummary = container.find('.item_short_text').text().trim() || node.closest('li').nextAll('.item_short_text').first().text().trim();
      let longSummary = container.find('.item_long_text').text().trim() || node.closest('li').nextAll('.item_long_text').first().text().trim();
      
      const fullText = container.text().replace(/\s+/g, ' ');

      if (!shortSummary) {
          if (fullText.includes('ย่อสั้น')) {
              shortSummary = fullText.split('ย่อสั้น')[1]?.split('ย่อยาว')[0]?.trim() || '';
          }
      }
      
      if (!longSummary) {
          if (fullText.includes('ย่อยาว')) {
              longSummary = fullText.split('ย่อยาว')[1]?.split('ชื่อคู่ความ')[0]?.trim() || '';
          }
      }
      
      let parties = null;
      let judge = null;
      let law = null;
      let court = null;
      
      if (fullText.includes('ชื่อคู่ความ')) {
          let temp = fullText.split('ชื่อคู่ความ')[1];
          if (temp.includes('ชื่อองค์คณะ')) temp = temp.split('ชื่อองค์คณะ')[0];
          else if (temp.includes('ฎีกาอื่นที่เกี่ยวข้อง')) temp = temp.split('ฎีกาอื่นที่เกี่ยวข้อง')[0];
          else if (temp.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) temp = temp.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[0];
          parties = temp.trim();
      }
      
      if (fullText.includes('ชื่อองค์คณะ')) {
          let temp = fullText.split('ชื่อองค์คณะ')[1];
          if (temp.includes('ฎีกาอื่นที่เกี่ยวข้อง')) temp = temp.split('ฎีกาอื่นที่เกี่ยวข้อง')[0];
          else if (temp.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) temp = temp.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[0];
          judge = temp.trim();
      }
      
      if (fullText.includes('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')) {
          let temp = fullText.split('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')[1];
          if (temp.includes('แหล่งที่มา')) temp = temp.split('แหล่งที่มา')[0];
          law = temp.replace('ย่อสั้น', '').trim();
      }

      if (fullText.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) {
          let temp = fullText.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[1];
          if (temp.includes('แหล่งที่มา')) temp = temp.split('แหล่งที่มา')[0];
          court = temp.trim();
      }

      if (shortSummary || longSummary) {
          inserts.push({
            decisionNumber,
            decisionYear,
            shortSummary: shortSummary || null,
            longSummary: longSummary || null,
            parties: parties || null,
            judge: judge || null,
            law: law || null,
            court: court || null,
            source: 'deka.supremecourt.or.th (Bulk HTML Import)',
          });
          existingKeys.add(decisionNumber); // Prevent duplicates within same run
      }
    }
    return inserts;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

async function main() {
  console.log(`Scanning directory: ${IMPORT_DIR}`);
  if (!fs.existsSync(IMPORT_DIR)) {
    console.error(`Directory not found: ${IMPORT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.html') || f.endsWith('.htm'));
  console.log(`Found ${files.length} HTML files to process.`);

  console.log('Fetching existing decisions from database to prevent duplicates...');
  const existing = await prisma.decision.findMany({ select: { decisionNumber: true } });
  const existingKeys = new Set(existing.map(e => e.decisionNumber));
  console.log(`Found ${existingKeys.size} existing decisions in DB.`);

  let totalImported = 0;
  const BATCH_SIZE = 50;
  let currentBatch: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(IMPORT_DIR, file);
    
    // Process file
    const fileInserts = await processFile(filePath, existingKeys);
    currentBatch.push(...fileInserts);

    process.stdout.write(`Processed file ${i+1}/${files.length} (${file}). Found ${fileInserts.length} new cases.\r`);

    // Insert batch if large enough
    if (currentBatch.length >= BATCH_SIZE || i === files.length - 1) {
      if (currentBatch.length > 0) {
        process.stdout.write(`\nInserting batch of ${currentBatch.length} records into database...\n`);
        try {
          await prisma.decision.createMany({
            data: currentBatch,
          });
          totalImported += currentBatch.length;
        } catch (err) {
          console.error('\nError inserting batch:', err);
        }
        currentBatch = [];
      }
    }
  }

  console.log(`\n\n✅ Bulk import completed successfully! Total ${totalImported} new cases imported.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
