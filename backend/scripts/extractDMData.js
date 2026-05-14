const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../Ams Final.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['DM'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const PLATFORMS = [
  'GMB', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube',
  'Meta Ads', 'Google Ads', 'LinkedIn Ads', 'E-commerce',
  'Other Platform', 'Influencer Marketing', 'WhatsApp Channel', 'SMS Shoot', 'WAST Shoot',
];

// Row 1 is platform header, rows 2-18 are daily tasks
const TASK_START = 2;
const TASK_END   = 18;

// Row 21 is audit platform header, rows 22-66 are metrics
const METRIC_START = 22;
const METRIC_END   = 66;

const tasks = {};
const metrics = {};

PLATFORMS.forEach((p, col) => {
  tasks[p]   = [];
  metrics[p] = [];
});

// Extract daily tasks
for (let row = TASK_START; row <= TASK_END; row++) {
  const r = raw[row] || [];
  PLATFORMS.forEach((p, col) => {
    const cell = String(r[col] || '').trim();
    if (cell) tasks[p].push(cell);
  });
}

// Extract audit metrics (cols 0-14 same platform order)
for (let row = METRIC_START; row <= METRIC_END; row++) {
  const r = raw[row] || [];
  PLATFORMS.forEach((p, col) => {
    const cell = String(r[col] || '').trim();
    if (cell) metrics[p].push(cell);
  });
}

console.log('=== DAILY TASKS ===');
PLATFORMS.forEach((p) => {
  console.log(`\n${p} (${tasks[p].length} tasks):`);
  tasks[p].forEach((t, i) => console.log(`  ${i+1}. ${t}`));
});

console.log('\n\n=== AUDIT METRICS ===');
PLATFORMS.forEach((p) => {
  console.log(`\n${p} (${metrics[p].length} metrics):`);
  metrics[p].forEach((m, i) => console.log(`  ${i+1}. ${m}`));
});

// Output JSON for seeder
const output = { platforms: PLATFORMS, tasks, metrics };
require('fs').writeFileSync(
  path.join(__dirname, 'dmSeedData.json'),
  JSON.stringify(output, null, 2)
);
console.log('\n\nJSON written to scripts/dmSeedData.json');
