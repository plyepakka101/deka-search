import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisionNumbers = [
    "5821/2544",
    "5820/2544",
    "5280/2544",
    "5273/2544",
    "5272/2544",
    "5265/2544",
    "5248/2544",
    "5243/2544",
    "5229/2544",
    "4573-5228/2544",
    "4565/2544",
    "4563/2544",
    "4561/2544",
    "4558/2544"
  ];

  console.log(`Attempting to delete ${decisionNumbers.length} decisions...`);

  let successCount = 0;
  for (const num of decisionNumbers) {
    try {
      await prisma.decision.delete({
        where: { decisionNumber: num }
      });
      console.log(`Deleted: ${num}`);
      successCount++;
    } catch (e: any) {
      if (e.code === 'P2025') {
        console.log(`Not found: ${num}`);
      } else {
        console.error(`Error deleting ${num}:`, e.message);
      }
    }
  }

  console.log(`Finished! Deleted ${successCount} out of ${decisionNumbers.length} records.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
