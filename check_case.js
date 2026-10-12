
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const d = await prisma.decision.findUnique({where: {decisionNumber: '625/2569'}});
  console.log(d.parties);
  console.log('---');
  console.log(d.law);
  console.log('---');
  console.log(d.judge);
  console.log('---');
  console.log(d.court);
}
run();

