import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    select: {
      id: true,
      decisionNumber: true,
    }
  });

  const badDecisions = decisions.filter(d => d.decisionNumber.length > 30 || d.decisionNumber.includes(' '));
  
  console.log(`Found ${badDecisions.length} decisions with potentially bad decision numbers.`);
  
  for (let i = 0; i < Math.min(20, badDecisions.length); i++) {
    console.log(`- ${badDecisions[i].decisionNumber}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
