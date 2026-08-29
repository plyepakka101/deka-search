import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      OR: [
        { law: { contains: '045' } },
        { law: { contains: '434' } },
        { law: { contains: '568' } },
        { law: { contains: '2512' } },
        { law: { contains: '3235' } },
        { law: { contains: '3336' } },
      ]
    }
  });

  for (const d of decisions) {
    console.log(`\nDecision: ${d.decisionNumber}`);
    console.log(`Law: ${d.law}`);
    console.log(`Short (length ${d.shortSummary?.length || 0}): ${d.shortSummary?.substring(0, 50)}`);
    console.log(`Long (length ${d.longSummary?.length || 0}): ${d.longSummary?.substring(0, 50)}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
