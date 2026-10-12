
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  console.log('Connecting...');
  try {
    const c = await prisma.decision.count();
    console.log('COUNT:', c);
    const bad = await prisma.decision.findMany({ where: { decisionYear: { gt: 2600 } }, select: { decisionNumber: true, decisionYear: true } });
    console.log('BAD:', bad);
  } catch(e) {
    console.error(e);
  }
}
run();

