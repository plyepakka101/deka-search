import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const decisions = await prisma.decision.findMany({ take: 5 })
  console.log(JSON.stringify(decisions.map(d => ({ 
    id: d.id, 
    num: d.decisionNumber, 
    parties: d.parties, 
    short: d.shortSummary,
    long: d.longSummary
  })), null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
