const https = require('https');

const postData = JSON.stringify({ "keywords": "664/2569" });

const options = {
  hostname: 'deka.supremecourt.or.th',
  port: 443,
  path: '/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Just find the block containing 664/2569
    const idx = data.indexOf('664/2569');
    console.log(data.substring(idx - 1000, idx + 2000));
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write('word=664%2F2569');
req.end();
