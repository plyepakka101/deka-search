import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding bad decision numbers...');
  
  // Find decisions where decisionNumber does NOT contain a slash
  // OR decisionNumber is very long (> 30 characters)
  const badDecisions = await prisma.decision.findMany({
    where: {
      OR: [
        { decisionNumber: { not: { contains: '/' } } },
        // Prisma doesn't have string length filter out of the box, but we can just fetch and filter in JS
      ]
    },
    select: {
      id: true,
      decisionNumber: true,
    }
  });

  const allDecisions = await prisma.decision.findMany({
    select: {
      id: true,
      decisionNumber: true,
    }
  });

  const toDelete = allDecisions.filter(d => 
    !d.decisionNumber.includes('/') || 
    d.decisionNumber.length > 40
  );

  console.log(`Found ${toDelete.length} bad decisions out of ${allDecisions.length} total.`);
  
  if (toDelete.length > 0) {
    console.log('Sample bad decision numbers:');
    toDelete.slice(0, 5).forEach(d => console.log(`- ${d.decisionNumber}`));

    const idsToDelete = toDelete.map(d => d.id);
    
    const result = await prisma.decision.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    });
    
    console.log(`Deleted ${result.count} bad decisions.`);
  } else {
    console.log('No bad decisions found.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
