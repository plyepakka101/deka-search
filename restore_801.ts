import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    where: { decisionNumber: '3200/2522' }
  });

  for (const d of decisions) {
    let changed = false;
    let newLaw = d.law || '';
    let newShort = d.shortSummary || '';
    let newLong = d.longSummary || '';

    // Only restore 80 -> 801 in Civil Code contexts or generally for this specific decision since we wrongly changed it
    const restore = (text: string) => {
      // 80 to 801
      return text.replace(/\b80\b/g, '801').replace(/\b๘๐\b/g, '๘๐๑');
    };

    if (newLaw.includes('80') || newLaw.includes('๘๐')) {
      newLaw = restore(newLaw);
      changed = true;
    }
    if (newShort.includes('80') || newShort.includes('๘๐')) {
      newShort = restore(newShort);
      changed = true;
    }
    if (newLong.includes('80') || newLong.includes('๘๐')) {
      newLong = restore(newLong);
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
      console.log(`Restored decision ${d.decisionNumber}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
