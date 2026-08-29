const cheerio = require('cheerio');
const fs = require('fs');

async function main() {
  const res = await fetch('https://deka.supremecourt.or.th/search', {
    method: 'POST',
    body: new URLSearchParams({'word': '664/2569'}),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const htmlContent = await res.text();
  const $ = cheerio.load(htmlContent);

  const decisionNodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
    return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
  });

  console.log("Nodes found:", decisionNodes.length);

  for (let i = 0; i < Math.min(2, decisionNodes.length); i++) {
    const node = $(decisionNodes[i]);
    let container = node.closest('table, tbody, li, tr').parent(); 
    if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
       container = node.closest('table');
    }
    if (container.length === 0) {
       container = node.parent().parent();
    }

    const shortSummary = container.find('.item_short_text').text().trim() || node.closest('li').nextAll('.item_short_text').first().text().trim();
    const longSummary = container.find('.item_long_text').text().trim() || node.closest('li').nextAll('.item_long_text').first().text().trim();
    
    console.log("--- DECISION ---");
    console.log("Short:", shortSummary.substring(0, 50) + "...");
    console.log("Long:", longSummary.substring(0, 50) + "...");
  }
}
main();
