import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    take: 5,
    where: { law: { not: null } }
  });
  for (const dec of decisions) {
    console.log(`${dec.decisionNumber} law:\n`, JSON.stringify(dec.law));
  }
}
main();
