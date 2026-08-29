import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all decisions...');
  const res = await prisma.decision.deleteMany({});
  console.log(`Deleted ${res.count} decisions.`);
}

main().catch(console.error);
