
const fs = require('fs');

// A simple 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXYzh8+PB/AAgwA5QFBcOcxjAAAAAASUVORK5CYII=';

const buf = Buffer.from(pngBase64, 'base64');
fs.writeFileSync('public/icon-192x192.png', buf);
fs.writeFileSync('public/icon-512x512.png', buf);
console.log('Icons created.');

