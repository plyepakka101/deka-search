const BOOKS = [
  { id: 'crim', name: 'ประมวลกฎหมายอาญา', abbreviation: 'ป.อ.' },
  { id: 'civil', name: 'ประมวลกฎหมายแพ่งและพาณิชย์', abbreviation: 'ป.พ.พ.' },
  { id: 'civil_proc', name: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง', abbreviation: 'ป.วิ.พ.' },
  { id: 'crim_proc', name: 'ประมวลกฎหมายวิธีพิจารณาความอาญา', abbreviation: 'ป.วิ.อ.' },
  { id: 'kwaeng', name: 'พ.ร.บ. จัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง', abbreviation: 'ศาลแขวง' },
];

let lawText = "ป.วิ.อ. ม. 193, ม. 216, ม. 218, ม. 221, ม. 225 พ.ร.บ.จัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง พ.ศ.2499 ม. 4 พ.ร.บ.ให้นำวิธีพิจารณาความอาญาในศาลแขวงมาใช้บังคับในศาลจังหวัด พ.ศ.2520 ม. 3";

let formatted = lawText.replace(/\n/g, ' ').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');

const sortedBooks = [...BOOKS].sort((a, b) => b.abbreviation.length - a.abbreviation.length);

for (const book of sortedBooks) {
  const regex = new RegExp(`\\s+(${book.abbreviation.replace(/\./g, '\\.')})`, 'g');
  formatted = formatted.replace(regex, '\n$1');
}

console.log("Formatted:", JSON.stringify(formatted));

const lines = formatted.split('\n').filter(Boolean).map(l => l.trim());

for (const line of lines) {
  const matchedBook = sortedBooks.find(b => line.startsWith(b.abbreviation) || line.includes(b.abbreviation) || line.includes(b.name));
  console.log("Line:", line);
  console.log("Matched:", matchedBook ? matchedBook.id : "None");
}
