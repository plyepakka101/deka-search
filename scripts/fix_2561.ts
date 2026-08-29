import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const d = await prisma.decision.findFirst({
    where: {
      decisionNumber: '2561/2534 (2)',
    }
  });

  if (d) {
    await prisma.decision.update({
      where: { id: d.id },
      data: {
        decisionNumber: '2561/2561',
        decisionYear: 2561,
        parties: '๒๕๓๔       นายประสิทธิ์ จันทราทิพย์|โจทก์๕๓๖        นางนพพร จันทราทิพย์|จำเลย' // restoring original
      }
    });
    console.log("Restored to 2561/2561");
  } else {
    console.log("Decision 2561/2534 (2) not found!");
  }
}

main().catch(console.error);
