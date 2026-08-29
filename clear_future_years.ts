import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const currentYear = new Date().getFullYear() + 543;
  const result = await prisma.decision.updateMany({
    where: {
      decisionYear: {
        gt: currentYear
      }
    },
    data: {
      decisionYear: null
    }
  });

  console.log(`Cleared decisionYear for ${result.count} decisions with future years.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
