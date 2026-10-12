const fs = require('fs');
const cheerio = require('cheerio');
const files = fs.readdirSync('to_import');
let foundFiles = [];
for (let file of files) {
  if (file.includes('20151073.html') || file.includes('3045.html')) foundFiles.push(file);
}

for (let file of foundFiles) {
  const htmlContent = fs.readFileSync('to_import/' + file, 'utf8');
  const $ = cheerio.load(htmlContent);

  const decisionNodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
    return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
  });

  for (let i = 0; i < decisionNodes.length; i++) {
    const node = $(decisionNodes[i]);
    let title = node.text().trim();
    
    let container = node.closest('table, tbody, li, tr').parent(); 
    if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
       container = node.closest('table');
    }
    if (container.length === 0) {
       container = node.parent().parent();
    }
    let shortSummary = container.find('.item_short_text').text().trim() || node.closest('li').nextAll('.item_short_text').first().text().trim();
    if (shortSummary.includes('ศาลชั้นต้นพิพากษาว่าคดีโจทก์ไม่ขาดอายุความ')) {
       console.log('Found in', file, '=>', title);
    }
  }
}
