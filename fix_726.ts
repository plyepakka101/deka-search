import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      OR: [
        { law: { contains: '726' } },
        { law: { contains: '๗๒๖' } },
        { shortSummary: { contains: '726' } },
        { shortSummary: { contains: '๗๒๖' } },
        { longSummary: { contains: '726' } },
        { longSummary: { contains: '๗๒๖' } },
      ]
    }
  });

  console.log(`Found ${decisions.length} decisions containing 726 or ๗๒๖.`);

  let updatedCount = 0;

  for (const d of decisions) {
    let changed = false;
    let newLaw = d.law;
    let newShort = d.shortSummary;
    let newLong = d.longSummary;

    if (newLaw && (newLaw.includes('726') || newLaw.includes('๗๒๖'))) {
      newLaw = newLaw.replace(/726/g, '326').replace(/๗๒๖/g, '๓๒๖');
      changed = true;
    }
    if (newShort && (newShort.includes('726') || newShort.includes('๗๒๖'))) {
      newShort = newShort.replace(/726/g, '326').replace(/๗๒๖/g, '๓๒๖');
      changed = true;
    }
    if (newLong && (newLong.includes('726') || newLong.includes('๗๒๖'))) {
      newLong = newLong.replace(/726/g, '326').replace(/๗๒๖/g, '๓๒๖');
      changed = true;
    }

    if (changed) {
      await prisma.decision.update({
        where: { id: d.id },
        data: {
          law: newLaw,
          shortSummary: newShort,
          longSummary: newLong,
        }
      });
      console.log(`Updated decision ${d.decisionNumber}`);
      updatedCount++;
    }
  }

  console.log(`Total updated: ${updatedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
