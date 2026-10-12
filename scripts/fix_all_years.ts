
import { prisma } from '../src/lib/prisma';

const fixes = {
  '6655/2754': 2554,
  '2842/2754': 2554,
  '2381/2754': 2554,
  '7011/3041': 2541,
  '1549/4049': 2549,
  '1739/4239': 2539,
  '1085/4291': 2541,
  '2015/4515': 2515,
  '1812/2511644': 2511,
  '381/25312531': 2531,
  '4246/25322532': 2532,
  '2561/2534 (2)': 2561, // The special one where year was parsed wrong
};

async function run() {
  console.log('Starting year fixes on Turso...');
  for (const [decisionNumber, fixedYear] of Object.entries(fixes)) {
    try {
      if (decisionNumber === '2561/2534 (2)') {
        const d = await prisma.decision.findFirst({ where: { decisionNumber } });
        if (d) {
          await prisma.decision.update({
            where: { id: d.id },
            data: {
              decisionNumber: '2561/2561',
              decisionYear: 2561,
              parties: '๒๕๓๔       นายประสิทธิ์ จันทราทิพย์|โจทก์๕๓๖        นางนพพร จันทราทิพย์|จำเลย'
            }
          });
          console.log('Fixed 2561/2534 (2)');
        }
        continue;
      }

      const fixedNumber = decisionNumber.split('/')[0] + '/' + fixedYear;
      
      const d = await prisma.decision.findFirst({ where: { decisionNumber } });
      if (d) {
        await prisma.decision.update({
          where: { id: d.id },
          data: { decisionYear: fixedYear, decisionNumber: fixedNumber }
        });
        console.log('Fixed', decisionNumber, 'to', fixedNumber);
      }
    } catch(e: any) {
      console.error('Failed to fix', decisionNumber, e.message);
    }
  }

  // Double check if there are any other years > 2569
  const badCases = await prisma.decision.findMany({
    where: {
      decisionYear: { gt: 2569 }
    }
  });
  console.log('Other cases with year > 2569:', badCases.map(c => c.decisionNumber));
}
run();

