const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dataDir = 'D:/Projects/reverse/juris-work/extracted/assets/public/data/';

const lawsToConvert = [
  {
    json: 'consumer-proc-th.json',
    toc: 'toc-consumer_proc.json',
    id: 'consumer_proc',
    varName: 'RAW_CONSUMER_PROC_CODE',
    fileName: 'src/components/law-mate/services/lawConsumerProc.ts',
    name: 'พระราชบัญญัติวิธีพิจารณาคดีผู้บริโภค พ.ศ. 2551',
    abbreviation: 'ผบ.',
    color: 'bg-amber-600',
    description: 'วิธีพิจารณาคดีผู้บริโภค ภาระการพิสูจน์ ความรับผิดต่อสินค้าที่ไม่ปลอดภัย'
  },
  {
    json: 'copyright-th.json',
    toc: 'toc-copyright.json',
    id: 'copyright',
    varName: 'RAW_COPYRIGHT_CODE',
    fileName: 'src/components/law-mate/services/lawCopyright.ts',
    name: 'พระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537',
    abbreviation: 'พ.ร.บ.ลิขสิทธิ์',
    color: 'bg-purple-600',
    description: 'งานอันมีลิขสิทธิ์ การได้มา การคุ้มครอง ข้อยกเว้นการละเมิดลิขสิทธิ์'
  },
  {
    json: 'juvenile-court-th.json',
    toc: 'toc-juvenile_court.json',
    id: 'juvenile_court',
    varName: 'RAW_JUVENILE_COURT_CODE',
    fileName: 'src/components/law-mate/services/lawJuvenileCourt.ts',
    name: 'พระราชบัญญัติศาลเยาวชนและครอบครัวและวิธีพิจารณาคดีเยาวชนและครอบครัว พ.ศ. 2553',
    abbreviation: 'ศาลเยาวชนฯ',
    color: 'bg-pink-600',
    description: 'วิธีพิจารณาคดีเยาวชนและครอบครัว การจับกุม ตรวจสอบการจับ มาตรการพิเศษแทนการดำเนินคดีอาญา'
  },
  {
    json: 'labour-protection-th.json',
    toc: 'toc-labour_protection.json',
    id: 'labour_protection',
    varName: 'RAW_LABOUR_PROTECTION_CODE',
    fileName: 'src/components/law-mate/services/lawLabourProtection.ts',
    name: 'พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541',
    abbreviation: 'คุ้มครองแรงงาน',
    color: 'bg-orange-500',
    description: 'การใช้แรงงาน ค่าจ้าง สิทธิ สวัสดิการ การบอกเลิกสัญญา และค่าชดเชยการเลิกจ้าง'
  },
  {
    json: 'admin-court-th.json',
    toc: 'toc-admin_court.json',
    id: 'admin_court',
    varName: 'RAW_ADMIN_COURT_CODE',
    fileName: 'src/components/law-mate/services/lawAdminCourt.ts',
    name: 'พระราชบัญญัติจัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง พ.ศ. 2542',
    abbreviation: 'ศาลปกครอง',
    color: 'bg-sky-600',
    description: 'การจัดตั้งและเขตอำนาจศาลปกครอง อำนาจฟ้องคดีปกครอง เงื่อนไขและอายุความฟ้องคดี'
  },
  {
    json: 'revenue-th.json',
    toc: 'toc-revenue.json',
    id: 'revenue',
    varName: 'RAW_REVENUE_CODE',
    fileName: 'src/components/law-mate/services/lawRevenue.ts',
    name: 'ประมวลรัษฎากร',
    abbreviation: 'ป.รัษฎากร',
    color: 'bg-emerald-700',
    description: 'ภาษีเงินได้บุคคลธรรมดา นิติบุคคล ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์'
  }
];

async function main() {
  console.log('Starting conversion and database upsert of Juris-Voice law datasets...');

  for (const item of lawsToConvert) {
    const jsonPath = path.join(dataDir, item.json);
    const tocPath = path.join(dataDir, item.toc);

    if (!fs.existsSync(jsonPath) || !fs.existsSync(tocPath)) {
      console.warn(`Skipping ${item.id}: files not found`);
      continue;
    }

    const lawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const tocData = JSON.parse(fs.readFileSync(tocPath, 'utf8'));

    const headingsMap = new Map();
    function walkToc(nodes) {
      for (const node of nodes) {
        let headerText = '';
        if (node.word && node.num) {
          headerText = node.word + ' ' + node.num + '\n' + node.name;
        } else if (node.name) {
          headerText = node.name;
        }
        if (node.range && node.range.from) {
          const fromSec = node.range.from.trim();
          if (!headingsMap.has(fromSec)) headingsMap.set(fromSec, []);
          headingsMap.get(fromSec).push({ tier: node.tier, header: headerText });
        }
        if (node.children && node.children.length > 0) {
          walkToc(node.children);
        }
      }
    }
    walkToc(tocData);

    let contentParts = [item.name];
    for (const sec of lawData.sections) {
      const secNum = sec.number.trim();
      if (headingsMap.has(secNum)) {
        const hList = headingsMap.get(secNum).sort((a, b) => a.tier - b.tier);
        for (const h of hList) {
          contentParts.push(h.header);
        }
      }
      contentParts.push(sec.text);
    }
    const fullContent = contentParts.join('\n\n');

    // 1. Write the TS service file
    const targetFilePath = path.resolve(__dirname, '..', item.fileName);
    const tsContent = `export const ${item.varName} = \`${fullContent.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;\n`;
    fs.writeFileSync(targetFilePath, tsContent, 'utf8');
    console.log(`Generated file: ${item.fileName} (${fullContent.length} chars, ${lawData.sections.length} sections)`);

    // 2. Upsert into database
    console.log(`Upserting ${item.name} (${item.id}) into database...`);
    await prisma.lawBook.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        abbreviation: item.abbreviation,
        content: fullContent,
        color: item.color,
        description: item.description,
        lastUpdated: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
      },
      create: {
        id: item.id,
        name: item.name,
        abbreviation: item.abbreviation,
        content: fullContent,
        color: item.color,
        description: item.description,
        lastUpdated: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
      }
    });
  }

  console.log('All laws successfully imported and updated in database!');
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
