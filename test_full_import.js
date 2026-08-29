const cheerio = require('cheerio');
const fs = require('fs');

async function main() {
  const res = await fetch('https://deka.supremecourt.or.th/search', {
    method: 'POST',
    body: new URLSearchParams({'word': '664/2569'}),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const htmlContent = await res.text();
  
  const apiRes = await fetch('http://localhost:3000/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'test.html', htmlContent })
  });

  console.log('Status:', apiRes.status);
  console.log('Body:', await apiRes.text());
}
main();
