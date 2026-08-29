import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(process.cwd(), 'files_to_reimport.txt');
const outputPath = path.join('C:\\Users\\PRAMOT\\.gemini\\antigravity\\brain\\c7ad2cfc-5039-469f-be04-616d57a59cfe\\scratch', 'files_to_reimport.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

const csvContent = 'filename\n' + lines.join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, csvContent, 'utf-8');

console.log(`Saved to ${outputPath}`);
