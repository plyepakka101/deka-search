
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.decision.count({ where: { decisionYear: null } });
  console.log('NULL COUNT:', c);
}
run();

