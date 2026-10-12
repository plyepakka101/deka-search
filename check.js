
const fs = require('fs');
const files = fs.readdirSync('to_import');
const file = files.find(f => f.includes('3045.html'));
const content = fs.readFileSync('to_import/' + file, 'utf8');
const idx = content.indexOf('ศาลชั้นต้นพิพากษาว่าคดีโจทก์ไม่ขาดอายุความ');
console.log(content.substring(idx - 500, idx + 500));

