const fs = require('fs'); 
const lines = fs.readFileSync('D:\\Downloads\\judgments_output.html', 'utf8').split('\n'); 
let start = -1;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('5280/2544')) {
    start = Math.max(0, i - 15);
    break;
  }
}
if (start > -1) {
  const snippet = lines.slice(start, start + 200).join('\n');
  fs.writeFileSync('judgments_5280.txt', snippet);
  console.log("Saved snippet for 5280/2544");
} else {
  console.log("Not found 5280/2544");
}
