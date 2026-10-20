const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopDir = path.join(process.env.USERPROFILE, 'Desktop');
const appExe = path.join(process.env.LOCALAPPDATA, 'Programs', 'marsam', 'مرسم - إدارة المرسم.exe');

console.log('--- Marsam Diagnostic & Cleanup ---');
console.log('App Exe exists:', fs.existsSync(appExe), appExe);

// 1. Check processes
try {
  const tasklist = execSync('tasklist', { encoding: 'utf8' });
  const lines = tasklist.split('\n').filter(l => l.includes('مرسم') || l.includes('electron'));
  console.log('Running processes:', lines.length > 0 ? lines : 'None');
} catch (e) {
  console.error('Error running tasklist:', e.message);
}

// 2. Inspect Desktop
const files = fs.readdirSync(desktopDir);
console.log('Desktop items related to Marsam:');
files.filter(f => f.includes('مرسم') || f.includes('Marsam')).forEach(f => {
  const s = fs.statSync(path.join(desktopDir, f));
  console.log(`  - ${f} (${s.size} bytes)`);
});
