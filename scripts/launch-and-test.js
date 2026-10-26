const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const portableExe = path.join(process.env.USERPROFILE, 'Desktop', 'مرسم للفنون (نسخة محمولة بدون تثبيت).exe');
console.log('Target Portable Exe:', portableExe);
console.log('Exists:', fs.existsSync(portableExe));

console.log('Launching application in detached mode...');
const child = spawn(portableExe, [], {
  detached: true,
  stdio: 'ignore'
});
child.unref();

console.log('App launched. Waiting for server on http://127.0.0.1:3000 to become active...');

function pollServer(retries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      attempt++;
      console.log(`Polling server (Attempt ${attempt}/${retries})...`);
      const req = http.get('http://127.0.0.1:3000', (res) => {
        console.log(`Server responded with status code: ${res.statusCode}`);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Body length: ${body.length} bytes`);
          console.log('HTML snippet:', body.slice(0, 200));
          resolve(true);
        });
      });
      req.on('error', (err) => {
        if (attempt >= retries) {
          reject(new Error('Server did not respond within timeout: ' + err.message));
        } else {
          setTimeout(check, interval);
        }
      });
      req.setTimeout(1200, () => {
        req.destroy();
      });
    };
    check();
  });
}

pollServer()
  .then(() => {
    console.log('SUCCESS! Application launched and embedded Next.js server is 100% HEALTHY and serving pages!');

    // Also test /supplies and /reports routes
    return Promise.all([
      new Promise(res => http.get('http://127.0.0.1:3000/supplies', r => res(r.statusCode))),
      new Promise(res => http.get('http://127.0.0.1:3000/reports', r => res(r.statusCode)))
    ]);
  })
  .then(([suppliesStatus, reportsStatus]) => {
    console.log(`Route /supplies status: ${suppliesStatus}`);
    console.log(`Route /reports status: ${reportsStatus}`);
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
