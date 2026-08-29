import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const d = await prisma.decision.findUnique({where: {decisionNumber: '139/2569'}});
  console.log('PARTIES:\n', d?.parties);
  console.log('---');
  console.log('SHORT:\n', d?.shortSummary);
  console.log('---');
  console.log('LONG:\n', d?.longSummary?.substring(0, 500) + '...');
}

main().catch(console.error);
