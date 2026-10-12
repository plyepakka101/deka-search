
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const bad = await prisma.decision.findMany({ 
    where: { decisionYear: { lt: 2400 } } 
  });
  console.log('LOW YEARS:', bad.map(b => b.decisionYear));
}
run();

