const fs = require('fs');
const cheerio = require('cheerio');
const files = fs.readdirSync('to_import');
const file = files.find(f => f.includes('3045.html'));
const htmlContent = fs.readFileSync('to_import/' + file, 'utf8');
const $ = cheerio.load(htmlContent);

const decisionNodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
  return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
});

for (let i = 0; i < decisionNodes.length; i++) {
  const node = $(decisionNodes[i]);
  let container = node.closest('table, tbody, li, tr').parent(); 
  if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
     container = node.closest('table');
  }
  if (container.length === 0) {
     container = node.parent().parent();
  }
  
  const text = container.text();
  console.log('--- CASE ---');
  if (text.includes('ชื่อคู่ความ')) {
    const partiesText = text.split('ชื่อคู่ความ')[1]?.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[0]?.split('แหล่งที่มา')[0]?.trim();
    console.log('Parties:', partiesText);
  }
  if (text.includes('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')) {
    const lawText = text.split('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')[1]?.split('แหล่งที่มา')[0]?.split('ชื่อคู่ความ')[0]?.trim();
    console.log('Law:', lawText);
  }
}
