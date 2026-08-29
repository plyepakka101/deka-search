import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.decision.deleteMany({
    where: {
      decisionNumber: '5281/2544'
    }
  });

  console.log(`Deleted ${result.count} decisions.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
