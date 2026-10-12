
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.decision.deleteMany({ where: { decisionNumber: '7011/3041' } });
  console.log('Deleted 7011/3041');
  
  const updates = [
    { old: '6655/2754', newNum: '6655/2554', newYear: 2554 },
    { old: '2842/2754', newNum: '2842/2554', newYear: 2554 },
    { old: '2381/2754', newNum: '2381/2554', newYear: 2554 },
    { old: '1549/4049', newNum: '1549/2549', newYear: 2549 },
    { old: '1739/4239', newNum: '1739/2539', newYear: 2539 },
    { old: '2015/4515', newNum: '2015/2515', newYear: 2515 }
  ];
  
  for (const u of updates) {
    await prisma.decision.updateMany({
      where: { decisionNumber: u.old },
      data: { decisionNumber: u.newNum, decisionYear: u.newYear }
    });
    console.log('Updated', u.old, 'to', u.newNum);
  }
}
run();

