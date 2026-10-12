const fs = require('fs');
const cheerio = require('cheerio');
const files = fs.readdirSync('to_import');
const file = files.find(f => f.includes('3045.html'));
const htmlContent = fs.readFileSync('to_import/' + file, 'utf8');
const $ = cheerio.load(htmlContent);

// Check if they use an H4, H3, or strong tag for the title
const bNodes = $("b:contains('คำพิพากษาศาลฎีกาที่'), strong:contains('คำพิพากษาศาลฎีกาที่'), h4:contains('คำพิพากษาศาลฎีกาที่')");
console.log('Bold/Strong/H4 count:', bNodes.length);
bNodes.each((i, el) => {
    console.log('Title node text:', $(el).text().trim());
});
