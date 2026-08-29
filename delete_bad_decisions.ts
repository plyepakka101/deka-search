import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisionsToDelete = [
    '5821/2544', '5820/2544', '5280/2544', '5273/2544', '5272/2544', 
    '5265/2544', '5248/2544', '5243/2544', '5229/2544', '4573-5228/2544', 
    '4565/2544', '4563/2544', '4561/2544', '4558/2544'
  ];

  const result = await prisma.decision.deleteMany({
    where: {
      decisionNumber: {
        in: decisionsToDelete
      }
    }
  });

  console.log(`Deleted ${result.count} decisions.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
