
const fs = require('fs');
const sql = fs.readFileSync('schema.sql', 'utf16le');
fs.writeFileSync('schema2.sql', sql, 'utf8');

