const fs = require('fs');
const path = require('path');

try {
  const inputFile = 'D:\\Downloads\\ฐานข้อมูลฎีกา\\ประมวลกฎหมายยาเสพติด.txt';
  const outputFile = 'C:\\Users\\PRAMOT\\.gemini\\antigravity\\scratch\\deka-search\\src\\components\\law-mate\\services\\lawNarcotics.ts';
  
  const text = fs.readFileSync(inputFile, 'utf-8');
  const code = `export const RAW_NARCOTICS_CODE = \`\n${text.replace(/`/g, '\\`')}\`;\n`;
  
  fs.writeFileSync(outputFile, code);
  console.log("Success");
} catch(e) {
  console.error("Error:", e.message);
}
