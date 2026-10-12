
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const all = await prisma.decision.findMany({ select: { decisionNumber: true, shortSummary: true } });
  const map = new Map();
  let phantomCount = 0;
  for (const c of all) {
    if (!c.shortSummary) continue;
    if (map.has(c.shortSummary)) {
      phantomCount++;
    } else {
      map.set(c.shortSummary, c.decisionNumber);
    }
  }
  console.log('Phantom cases found by identical summary:', phantomCount);
}
run();

