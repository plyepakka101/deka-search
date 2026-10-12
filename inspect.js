
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const bad = await prisma.decision.findMany({ 
    where: { decisionYear: { gt: 2600 } } 
  });
  bad.forEach(b => console.log(b.decisionNumber, '==>', b.shortSummary?.substring(0, 50)));
}
run();

