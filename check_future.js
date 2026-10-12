
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const future = await prisma.decision.findMany({ 
    where: { decisionYear: { gt: 2570 } }, 
    select: { decisionNumber: true, decisionYear: true } 
  });
  console.log(future);
}
run();

