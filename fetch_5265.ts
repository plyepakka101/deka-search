import * as cheerio from 'cheerio';

async function main() {
  const res = await fetch('https://deka.supremecourt.or.th/search', {
    method: 'POST',
    body: new URLSearchParams({'word': '5265/2544'}),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const html = await res.text();
  const fs = require('fs');
  fs.writeFileSync('5265_full.html', html);
  console.log("Saved 5265_full.html");
}
main();
