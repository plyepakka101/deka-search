
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const nums = ['6655/2554', '2842/2554', '2381/2554', '7011/2541', '1549/2549', '1739/2539', '2015/2515'];
  const existing = await prisma.decision.findMany({ 
    where: { decisionNumber: { in: nums } }, 
    select: { decisionNumber: true } 
  });
  console.log('Existing:', existing.map(e => e.decisionNumber));
}
run();

