const fs = require('fs');
const path = require('path');

function search(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath, pattern);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].match(pattern)) {
                    console.log(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
                }
            }
        }
    }
}

search('C:/Users/PRAMOT/.gemini/antigravity/scratch/deka-search/src', /\bgetSectionCategory\b/);
