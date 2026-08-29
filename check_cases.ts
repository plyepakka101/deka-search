import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dec1 = await prisma.decision.findFirst({
    where: { decisionNumber: '5280/2544' }
  });
  console.log("5280/2544 parties:", dec1?.parties?.substring(0, 100));
  
  const dec2 = await prisma.decision.findFirst({
    where: { decisionNumber: '5265/2544' }
  });
  console.log("5265/2544 parties:", dec2?.parties?.substring(0, 100));

  const dec3 = await prisma.decision.findFirst({
    where: { decisionNumber: '4561/2544' }
  });
  console.log("4561/2544 parties:", dec3?.parties?.substring(0, 100));
  
  const duplicates = await prisma.decision.findMany({
    where: { decisionNumber: '5280/2544' }
  });
  console.log("Count of 5280/2544:", duplicates.length);
}
main();
