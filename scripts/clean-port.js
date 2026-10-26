const { execSync } = require('child_process');

try {
  if (process.platform === 'win32') {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = out.split('\n').filter(l => l.includes(':3000') && (l.includes('LISTENING') || l.includes('Listen')));
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && pid !== String(process.pid)) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[clean-port] Freed port 3000 from stale process PID ${pid}`);
        } catch {}
      }
    });
  }
} catch {}
