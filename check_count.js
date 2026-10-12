const fs = require('fs');
const cheerio = require('cheerio');
const files = fs.readdirSync('to_import').filter(f => f.endsWith('.html'));
const uniqueCases = new Set();
let totalExtracted = 0;

for (let j = 0; j < files.length; j++) {
  const file = files[j];
  const htmlContent = fs.readFileSync('to_import/' + file, 'utf8');
  const $ = cheerio.load(htmlContent);

  const decisionNodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
    return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
  });

  for (let i = 0; i < decisionNodes.length; i++) {
    const text = $(decisionNodes[i]).text().trim();
    const match = text.match(/คำพิพากษาศาลฎีกาที่\s*([0-9๐-๙]+)\s*\/\s*([0-9๐-๙]+)/);
    if (match && match.index !== undefined && match.index < 30) {
        totalExtracted++;
        const num = match[1];
        const yearStr = match[2];
        let year = parseInt(yearStr);
        if (year < 2400 && year > 0) year += 2500;
        uniqueCases.add(`${num}/${year}`);
    }
  }
}

console.log('Total files checked:', files.length);
console.log('Total cases found (including duplicates):', totalExtracted);
console.log('Total UNIQUE cases:', uniqueCases.size);
