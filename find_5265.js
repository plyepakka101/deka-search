const fs = require('fs'); 
const lines = fs.readFileSync('D:\\Downloads\\judgments_output.html', 'utf8').split('\n'); 
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('5265')) {
    console.log(`Found 5265 at line ${i}: ${lines[i]}`);
    let start = Math.max(0, i - 5);
    let end = Math.min(lines.length, i + 15);
    console.log(lines.slice(start, end).join('\n'));
    console.log('---');
  }
}
