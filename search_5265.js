const fs = require('fs'); 
const lines = fs.readFileSync('5265_full.html', 'utf8').split('\n'); 
let start = -1;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('๕๒๖๕/๒๕๔๔')) {
    start = i;
    break;
  }
}
if (start > -1) {
  let end = Math.min(lines.length, start + 100);
  const snippet = lines.slice(start, end).join('\n');
  fs.writeFileSync('5265_snippet.txt', snippet);
  console.log("Saved snippet for 5265");
} else {
  console.log("Not found ๕๒๖๕/๒๕๔๔");
}
