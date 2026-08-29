import * as cheerio from 'cheerio';

async function main() {
  const res = await fetch('https://deka.supremecourt.or.th/search', {
    method: 'POST',
    body: new URLSearchParams({'word': '3200/2522'}),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const htmlContent = await res.text();
  const $ = cheerio.load(htmlContent);
  const nodes = $("*:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
    return $(this).children(":contains('คำพิพากษาศาลฎีกาที่')").length === 0;
  });
  if (nodes.length > 0) {
    console.log(nodes.parent().parent().text().replace(/\s+/g, ' '));
  }
}
main();
