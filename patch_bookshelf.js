const fs = require('fs');
let content = fs.readFileSync('src/components/law-mate/components/Bookshelf.tsx', 'utf8');

// Modify Bookshelf.tsx to handle both hex and tailwind classes
content = content.replace(
  "const colorClass = book.color || 'bg-gray-500';",
  `const isHex = book.color?.startsWith('#');
          const colorClass = isHex ? '' : (book.color || 'bg-gray-500');
          const colorStyle = isHex ? { backgroundColor: book.color } : {};`
);

content = content.replace(
  "<div className={`h-2 w-full ${colorClass}`} />",
  "<div className={`h-2 w-full ${colorClass}`} style={colorStyle} />"
);

content = content.replace(
  "<div className={`w-12 h-16 rounded-md shadow-sm flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${colorClass} bg-opacity-90`}>",
  "<div className={`w-12 h-16 rounded-md shadow-sm flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${colorClass} bg-opacity-90`} style={colorStyle}>"
);

fs.writeFileSync('src/components/law-mate/components/Bookshelf.tsx', content, 'utf8');
console.log('Bookshelf.tsx updated');