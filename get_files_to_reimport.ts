import { PrismaClient } from '@prisma/client'
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      parties: null,
      importBatchId: { not: null }
    },
    include: {
      importBatch: true
    }
  });

  const fileNames = new Set<string>();
  decisions.forEach(dec => {
    if (dec.importBatch?.fileName) {
      fileNames.add(dec.importBatch.fileName);
    }
  });

  const fileList = Array.from(fileNames).sort();
  
  const content = fileList.join('\n');
  const outputPath = path.join(process.cwd(), 'files_to_reimport.txt');
  fs.writeFileSync(outputPath, content);
  
  console.log(`Found ${fileList.length} unique files that contain decisions missing 'parties'.`);
  console.log(`List saved to ${outputPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
