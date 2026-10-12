
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.decision.deleteMany({ where: { decisionNumber: { in: ['1163/2599', '1073/2592', '583/2591', '7011/3041', '1812/2511644', '381/25312531'] } } });
  console.log('Deleted');
}
run();

