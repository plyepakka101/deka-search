import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      OR: [
        { decisionNumber: '565/2520' },
        { 
          AND: [
            {
              OR: [
                { law: { contains: 'อาญา' } },
                { law: { contains: 'ป.อ.' } }
              ]
            },
            {
              OR: [
                { law: { contains: '801' } },
                { law: { contains: '๘๐๑' } },
                { shortSummary: { contains: '801' } },
                { shortSummary: { contains: '๘๐๑' } },
                { longSummary: { contains: '801' } },
                { longSummary: { contains: '๘๐๑' } }
              ]
            }
          ]
        }
      ]
    }
  });

  console.log(`Found ${decisions.length} decisions matching criteria.`);

  let updatedCount = 0;

  for (const d of decisions) {
    let changed = false;
    let newLaw = d.law || '';
    let newShort = d.shortSummary || '';
    let newLong = d.longSummary || '';

    const replace801 = (text: string) => {
      // Use regex with word boundaries to avoid replacing 8010 or 1801
      return text
        .replace(/\b801\b/g, '80')
        .replace(/\b๘๐๑\b/g, '๘๐');
    };

    if (newLaw && (newLaw.includes('801') || newLaw.includes('๘๐๑'))) {
      const replaced = replace801(newLaw);
      if (replaced !== newLaw) {
        newLaw = replaced;
        changed = true;
      }
    }
    if (newShort && (newShort.includes('801') || newShort.includes('๘๐๑'))) {
      const replaced = replace801(newShort);
      if (replaced !== newShort) {
        newShort = replaced;
        changed = true;
      }
    }
    if (newLong && (newLong.includes('801') || newLong.includes('๘๐๑'))) {
      const replaced = replace801(newLong);
      if (replaced !== newLong) {
        newLong = replaced;
        changed = true;
      }
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
