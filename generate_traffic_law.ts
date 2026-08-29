import * as fs from 'fs';

const txtPath = "D:\\Downloads\\ฐานข้อมูลฎีกา\\พระราชบัญญัติจราจรทางบก พ.ศ. 2522.txt";
const content = fs.readFileSync(txtPath, 'utf8');

const output = `export const RAW_TRAFFIC_LAW = \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;\n`;

fs.writeFileSync("C:\\Users\\PRAMOT\\.gemini\\antigravity\\scratch\\deka-search\\src\\components\\law-mate\\services\\lawTraffic.ts", output, 'utf8');
console.log("Created lawTraffic.ts");
