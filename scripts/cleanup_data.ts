import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data cleanup...');

  // 1. Delete decisions with invalid years (e.g., between 3450 and 6789)
  // To be safe, we delete anything where year > 3000
  const deleteRes = await prisma.decision.deleteMany({
    where: {
      decisionYear: {
        gte: 3000,
      },
    },
  });
  console.log(`Deleted ${deleteRes.count} decisions with invalid years (>= 3000).`);

  // 2. Clean up 'parties' field (remove ฿ and other strange markers)
  // Some legacy text uses ฿ as a delimiter or styling marker.
  // We will fetch all decisions that have '฿' in their parties field and update them.
  const decisionsToUpdate = await prisma.decision.findMany({
    where: {
      parties: {
        contains: '฿',
      },
    },
    select: {
      id: true,
      parties: true,
    },
  });

  console.log(`Found ${decisionsToUpdate.length} decisions with '฿' in parties. Cleaning up...`);

  let updateCount = 0;
  for (const decision of decisionsToUpdate) {
    if (decision.parties) {
      // Remove '฿' and any leading/trailing spaces
      const cleanParties = decision.parties.replace(/฿/g, '').trim();
      await prisma.decision.update({
        where: { id: decision.id },
        data: { parties: cleanParties },
      });
      updateCount++;
    }
  }

  console.log(`Updated ${updateCount} decisions' parties field.`);
  console.log('Cleanup completed successfully!');
}

main().catch(console.error);
