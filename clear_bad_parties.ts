import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    select: {
      id: true,
      decisionNumber: true,
      parties: true,
    }
  });

  let updateCount = 0;
  for (const dec of decisions) {
    if (dec.parties) {
      if (dec.parties.length > 250 || dec.parties.includes('พิพากษาแก้เป็นว่า') || dec.parties.includes('ศาลอุทธรณ์') || dec.parties.includes('ศาลชั้นต้น') || dec.parties.includes('การแถลงรับข้อเท็จจริง') || dec.parties.includes('สำหรับจำนวนปีที่ถือครองนั้น')) {
        await prisma.decision.update({
          where: { id: dec.id },
          data: { parties: null }
        });
        updateCount++;
        if (updateCount % 100 === 0) {
          console.log(`Cleared ${updateCount} bad parties...`);
        }
      }
    }
  }

  console.log(`\nSuccessfully cleared parties for ${updateCount} decisions.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
