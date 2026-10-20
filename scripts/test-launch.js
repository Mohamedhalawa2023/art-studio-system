const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const shortcut = path.join(process.env.USERPROFILE, 'Desktop', 'مرسم للفنون.lnk');
console.log('Testing launch of shortcut:', shortcut);

// Using cmd.exe /c start "" "shortcut"
const p = spawn('cmd.exe', ['/c', 'start', '""', shortcut], {
  detached: true,
  stdio: 'ignore'
});
p.unref();

console.log('Shortcut launched. Waiting 4 seconds to inspect processes...');
setTimeout(() => {
  const { execSync } = require('child_process');
  const tasklist = execSync('tasklist', { encoding: 'utf8' });
  const lines = tasklist.split('\n').filter(l => l.includes('مرسم') || l.includes('electron'));
  console.log('Running processes after launch:', lines);
  
  const logFile = path.join(process.env.APPDATA, 'MarsamArtStudio', 'logs', 'electron.log');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    console.log('Last 5 lines of electron.log:');
    console.log(lines.slice(-5).join('\n'));
  }
}, 4000);
