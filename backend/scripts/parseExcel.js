const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

const filePath = path.join(__dirname, '../../Ams Final.xlsx');
const wb = XLSX.readFile(filePath);

console.log('=== SHEET NAMES ===');
console.log(wb.SheetNames);
console.log('');

wb.SheetNames.forEach((name) => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n=== SHEET: ${name} (${data.length} rows) ===`);
  // Print first 80 rows
  data.slice(0, 80).forEach((row, i) => {
    const cells = row.map(c => String(c).trim()).filter(Boolean);
    if (cells.length > 0) console.log(`  [${i}] ${cells.join(' | ')}`);
  });
  if (data.length > 80) console.log(`  ... (${data.length - 80} more rows)`);
});
