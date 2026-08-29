import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const decisions = await prisma.decision.findMany({
    take: 10,
    select: { decisionNumber: true, shortSummary: true, longSummary: true }
  });

  for (const d of decisions) {
    console.log(`\nDecision: ${d.decisionNumber}`);
    const summary = (d.shortSummary || '') + " " + (d.longSummary || '');
    // Try to extract laws. A simple regex for test:
    const lawMatches = summary.match(/(?:ป\.[ก-๙\.]+|พ\.ร\.บ\.[ก-๙\.\s0-๙]+|ประมวลกฎหมาย[ก-๙\.\s]+|พระราชบัญญัติ[ก-๙\.\s0-๙]+)(?:มาตรา|ม\.)\s*[0-๙\.,\s]+/g);
    
    if (lawMatches) {
        console.log("Found Laws:", lawMatches);
    } else {
        console.log("No laws found.");
    }
  }
}

main().catch(console.error);
