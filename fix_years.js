
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  '4246/25322532': 2532
};

async function run() {
  for (const [decisionNumber, fixedYear] of Object.entries(fixes)) {
    const fixedNumber = decisionNumber.split('/')[0] + '/' + fixedYear;
    try {
      await prisma.decision.update({
        where: { decisionNumber },
        data: { decisionYear: fixedYear, decisionNumber: fixedNumber }
      });
      console.log('Fixed', decisionNumber, 'to', fixedNumber);
    } catch(e) {
      console.error('Failed to fix', decisionNumber, e.message);
    }
  }
}
run();

