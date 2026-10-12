
const fs = require('fs');
const files = fs.readdirSync('to_import').filter(f => f.endsWith('.html') || f.endsWith('.htm'));
const uniqueCases = new Set();
let totalFound = 0;

for (let j = 0; j < files.length; j++) {
  const content = fs.readFileSync('to_import/' + files[j], 'utf8');
  const matches = content.match(/¤Ó¾Ô¾Ò¡ÉÒÈÒÅ®Õ¡Ò·Õè\s*[0-9ð-ù]+\s*\/\s*[0-9ð-ù]+/g);
  if (matches) {
     for (const m of matches) {
         totalFound++;
         uniqueCases.add(m.replace(/\s+/g, ''));
     }
  }
}

console.log('Total files:', files.length);
console.log('Total cases (including duplicates across pages):', totalFound);
console.log('Total UNIQUE cases:', uniqueCases.size);

