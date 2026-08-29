import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function main() {
  const res = await fetch('https://deka.supremecourt.or.th/search', {
    method: 'POST',
    body: new URLSearchParams({'word': '4561/2544'}),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const htmlContent = await res.text();
  fs.writeFileSync('4561_full.html', htmlContent);
  console.log("Saved 4561_full.html");
}
main();
