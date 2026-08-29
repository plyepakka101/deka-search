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

  console.log(`Checking ${decisions.length} decisions for bad parties field...`);
  
  let badCount = 0;
  for (const dec of decisions) {
    if (dec.parties && dec.parties.length > 250) {
      console.log(`\nBAD PARTIES IN: ${dec.decisionNumber}`);
      console.log(`Length: ${dec.parties.length}`);
      console.log(`Preview: ${dec.parties.substring(0, 150)}...`);
      badCount++;
    } else if (dec.parties && dec.parties.includes('พิพากษาแก้เป็นว่า')) {
      console.log(`\nBAD PARTIES IN: ${dec.decisionNumber}`);
      console.log(`Length: ${dec.parties.length}`);
      console.log(`Preview: ${dec.parties.substring(0, 150)}...`);
      badCount++;
    }
  }

  console.log(`\nFound ${badCount} decisions with potentially bad parties field.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
