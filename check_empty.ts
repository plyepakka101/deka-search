import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emptyDecisions = await prisma.decision.findMany({
    where: {
      OR: [
        { longSummary: null },
        { longSummary: '' }
      ]
    }
  });

  console.log(`Found ${emptyDecisions.length} decisions with no long summary.`);
  
  const completelyEmpty = emptyDecisions.filter(d => !d.shortSummary && !d.longSummary);
  console.log(`Found ${completelyEmpty.length} decisions with NO short and NO long summary.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
