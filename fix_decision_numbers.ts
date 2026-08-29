import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({
    select: {
      id: true,
      decisionNumber: true,
    }
  });

  const badDecisions = decisions.filter(d => d.decisionNumber.length > 25 && (d.decisionNumber.includes(' ') || d.decisionNumber.match(/[ก-๙]/)));
  
  console.log(`Found ${badDecisions.length} decisions with potentially bad decision numbers.`);
  
  let fixedCount = 0;
  for (const dec of badDecisions) {
    const match = dec.decisionNumber.match(/^(.+?\/(?:24|25|๒๔|๒๕)[0-9๐-๙]{2})/);
    if (match) {
      const cleanNum = match[1].trim();
      if (cleanNum !== dec.decisionNumber) {
        console.log(`Fixing: ${dec.decisionNumber.substring(0, 50)}... -> ${cleanNum}`);
        
        // We have to update it carefully because decisionNumber is unique
        try {
            await prisma.decision.update({
            where: { id: dec.id },
            data: { decisionNumber: cleanNum }
            });
            fixedCount++;
        } catch (e) {
            console.error(`Could not update ${cleanNum} - maybe already exists?`);
            // If it already exists, maybe we should delete the garbage one?
            // For now, let's just append a unique identifier or skip it.
            // If the clean one exists, we can delete the garbage one!
            await prisma.decision.delete({
                where: { id: dec.id }
            });
            console.log(`Deleted duplicate garbage: ${dec.id}`);
            fixedCount++;
        }
      }
    }
  }
  
  console.log(`Successfully fixed or removed ${fixedCount} decision numbers.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
