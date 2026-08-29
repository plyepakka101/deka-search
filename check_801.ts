import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      decisionNumber: {
        in: [
          '6556/2541',
          '5363/2542',
          '576/2543',
          '403/2517',
          '8176/2542',
          '3200/2522',
          '565/2520',
          '2572/2540',
          '180/2490'
        ]
      }
    }
  });

  for (const d of decisions) {
    console.log(`\nDecision: ${d.decisionNumber}`);
    console.log(`Law: ${d.law}`);
    console.log(`Short: ${d.shortSummary?.substring(0, 50)}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
