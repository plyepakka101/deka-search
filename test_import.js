const fs = require('fs');

async function test() {
  const content = fs.readFileSync('sample_decision.html', 'utf8');
  const res = await fetch('http://localhost:3000/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'sample_decision.html', htmlContent: content })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
