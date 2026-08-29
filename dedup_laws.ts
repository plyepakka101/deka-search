import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    where: { law: { not: null } },
    select: { id: true, law: true, decisionNumber: true }
  });

  let fixed = 0;
  for (const d of decisions) {
    if (!d.law) continue;
    
    const parts = d.law.split(/,|\n/).map(l => l.trim()).filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    
    if (uniqueParts.length < parts.length) {
      const newLaw = uniqueParts.join(', ');
      await prisma.decision.update({
        where: { id: d.id },
        data: { law: newLaw }
      });
      console.log(`Fixed duplicates for ${d.decisionNumber}`);
      fixed++;
    }
  }
  console.log(`Successfully deduplicated laws in ${fixed} decisions.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
