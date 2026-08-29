import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dec = await prisma.decision.findFirst({
    where: { decisionNumber: '5281/2544' }
  });
  console.log("parties:\n", dec?.parties?.substring(0, 200) + '...');
  console.log("court:\n", dec?.court?.substring(0, 200) + '...');
  console.log("parties length:", dec?.parties?.length);
  console.log("court length:", dec?.court?.length);
}
main();
