/* eslint-disable @typescript-eslint/no-require-imports -- This launcher runs as plain Node.js before the app starts. */
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');
const SERVER_SCRIPT = path.join(ROOT, '.next', 'standalone', 'server.js');

function checkHealth(port, timeoutMs = 900) {
  return new Promise((resolve) => {
    const request = http.get(`http://${HOST}:${port}/api/health`, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(response.statusCode === 200 && payload.service === 'marsam' && payload.status === 'ok');
        } catch {
          resolve(false);
        }
      });
    });
    request.on('error', () => resolve(false));
    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, HOST, () => server.close(() => resolve(true)));
  });
}

async function selectPort() {
  for (let port = 3000; port <= 3010; port += 1) {
    if (await checkHealth(port)) return { port, startServer: false };
    if (await isPortAvailable(port)) return { port, startServer: true };
    console.log(`Port ${port} is in use by another application; leaving it untouched.`);
  }
  throw new Error('No free Marsam port is available between 3000 and 3010. Close an app using these ports, then try again.');
}

function launchBrowser(url) {
  const candidates = [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  const browser = candidates.find(candidate => fs.existsSync(candidate));

  const child = browser
    ? spawn(browser, [`--app=${url}`, '--window-size=1400,900'], { detached: true, stdio: 'ignore', windowsHide: true })
    : spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

async function waitUntilReady(port, child, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkHealth(port)) return;
    if (child.exitCode !== null) {
      throw new Error(`Marsam server stopped during startup (exit code ${child.exitCode}).`);
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  throw new Error('Marsam did not start within 45 seconds. Check the local server and try again.');
}

async function main() {
  if (!fs.existsSync(SERVER_SCRIPT)) {
    throw new Error('Production app files are missing. Rebuild the app with "npm run build" first.');
  }

  const { port, startServer } = await selectPort();
  const url = `http://${HOST}:${port}`;
  if (startServer) {
    const serverDir = path.dirname(SERVER_SCRIPT);
    const server = spawn(process.execPath, [SERVER_SCRIPT], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(port), HOSTNAME: HOST, NODE_ENV: 'production' },
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    server.unref();
    try {
      await waitUntilReady(port, server);
    } catch (error) {
      if (server.exitCode === null) server.kill();
      throw error;
    }
  }

  console.log(`Marsam is ready at ${url}`);
  launchBrowser(url);
}

main().catch(error => {
  console.error(`Could not launch Marsam: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
