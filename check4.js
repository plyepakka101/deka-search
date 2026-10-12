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
  if (container.length === 0 || container.prop('tagName') === 'BODY' || container.prop('tagName') === 'HTML') {
     container = node.closest('table');
  }
  if (container.length === 0) container = node.parent().parent();
  
  let parties = '';
  let judge = '';
  let law = '';
  let court = '';

  const text = container.text().replace(/\s+/g, ' ');
  
  if (text.includes('ชื่อคู่ความ')) {
     let temp = text.split('ชื่อคู่ความ')[1];
     if (temp.includes('ชื่อองค์คณะ')) temp = temp.split('ชื่อองค์คณะ')[0];
     else if (temp.includes('ฎีกาอื่นที่เกี่ยวข้อง')) temp = temp.split('ฎีกาอื่นที่เกี่ยวข้อง')[0];
     else if (temp.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) temp = temp.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[0];
     parties = temp.trim();
  }
  
  if (text.includes('ชื่อองค์คณะ')) {
     let temp = text.split('ชื่อองค์คณะ')[1];
     if (temp.includes('ฎีกาอื่นที่เกี่ยวข้อง')) temp = temp.split('ฎีกาอื่นที่เกี่ยวข้อง')[0];
     else if (temp.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) temp = temp.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[0];
     judge = temp.trim();
  }
  
  if (text.includes('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')) {
     let temp = text.split('ฎีกาอื่นที่เกี่ยวข้องแยกตามกฎหมายและมาตรา')[1];
     if (temp.includes('แหล่งที่มา')) temp = temp.split('แหล่งที่มา')[0];
     law = temp.replace('ย่อสั้น', '').trim();
  }

  if (text.includes('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')) {
     let temp = text.split('ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน')[1];
     if (temp.includes('แหล่งที่มา')) temp = temp.split('แหล่งที่มา')[0];
     court = temp.trim();
  }

  console.log('---');
  console.log('Case:', node.text().trim());
  console.log('Parties:', parties.substring(0, 50));
  console.log('Judge:', judge.substring(0, 50));
  console.log('Law:', law.substring(0, 50));
  console.log('Court:', court.substring(0, 50));
}
