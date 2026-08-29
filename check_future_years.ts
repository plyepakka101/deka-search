import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    where: {
      decisionYear: {
        gt: 2569
      }
    },
    select: {
      id: true,
      decisionNumber: true,
      decisionYear: true,
      caseNumberSupreme: true
    }
  });

  console.log(`Found ${decisions.length} decisions with year > 2569`);
  for (const dec of decisions) {
    console.log(`- ${dec.decisionNumber} (Year: ${dec.decisionYear})`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
