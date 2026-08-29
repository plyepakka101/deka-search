import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    select: {
      id: true,
      decisionNumber: true,
      decisionYear: true,
    }
  });

  console.log(`Found ${decisions.length} decisions to check`);
  
  let updatedCount = 0;
  for (const dec of decisions) {
    let newYear = null;
    const yearMatch = dec.decisionNumber.match(/\/([0-9]{4})/);
    if (yearMatch) {
      newYear = parseInt(yearMatch[1], 10);
    }
    
    if (newYear !== dec.decisionYear) {
      console.log(`Updating ${dec.decisionNumber}: ${dec.decisionYear} -> ${newYear}`);
      await prisma.decision.update({
        where: { id: dec.id },
        data: { decisionYear: newYear }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} decisions.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
