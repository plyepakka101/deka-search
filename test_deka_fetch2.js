const fetch = require('node-fetch');

async function main() {
  try {
    const params = new URLSearchParams();
    params.append('word', '664/2569');
    const res = await fetch('https://deka.supremecourt.or.th/search', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const text = await res.text();
    const idx = text.indexOf('664/2569');
    console.log(text.substring(Math.max(0, idx - 500), idx + 2000));
  } catch (e) {
    console.error(e);
  }
}
main();
