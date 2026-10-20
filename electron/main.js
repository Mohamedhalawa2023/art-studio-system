const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const HOST = '127.0.0.1';
const APP_URL = `http://${HOST}:${PORT}`;

// Setup log directory
function getLogFilePath() {
  const base = process.env.APPDATA || process.env.LOCALAPPDATA || (
    process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support')
      : path.join(process.env.HOME || '', '.config')
  );
  const logDir = path.join(base, 'MarsamArtStudio', 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, 'electron.log');
}

function logMessage(msg) {
  try {
    const time = new Date().toISOString();
    const line = `[${time}] ${msg}\n`;
    fs.appendFileSync(getLogFilePath(), line, 'utf-8');
    console.log(line.trim());
  } catch (e) {}
}

function pingServer(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'standalone');
  }
  return path.join(__dirname, '..', '.next', 'standalone');
}

async function startStandaloneServer() {
  const isAlive = await pingServer(APP_URL);
  if (isAlive) {
    logMessage(`Server is already alive on ${APP_URL}`);
    return;
  }

  const standaloneDir = getStandaloneDir();
  const serverScript = path.join(standaloneDir, 'server.js');

  logMessage(`Standalone directory: ${standaloneDir}`);
  logMessage(`Server script: ${serverScript}`);

  if (!fs.existsSync(serverScript)) {
    logMessage(`ERROR: Standalone server.js NOT FOUND at ${serverScript}`);
    return;
  }

  const nextModule = path.join(standaloneDir, 'node_modules', 'next');
  logMessage(`Next.js module path: ${nextModule} (Exists: ${fs.existsSync(nextModule)})`);

  logMessage(`Spawning standalone server process via ${process.execPath}...`);

  const env = Object.assign({}, process.env, {
    PORT: String(PORT),
    HOSTNAME: HOST,
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1'
  });

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: env,
    stdio: 'pipe',
    windowsHide: true
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (d) => logMessage(`[Next.js Server] ${d.toString().trim()}`));
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => logMessage(`[Next.js Error] ${d.toString().trim()}`));
  }

  serverProcess.on('exit', (code, signal) => {
    logMessage(`Server process exited with code ${code}, signal ${signal}`);
  });
}

function stopServer() {
  if (serverProcess) {
    logMessage('Terminating embedded Next.js server...');
    try {
      serverProcess.kill('SIGTERM');
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      }
    } catch (e) {}
    serverProcess = null;
  }
}

const splashHtml = `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <title>مرسم — جاري التحميل</title>
    <style>
      body {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .card {
        background: white;
        padding: 40px 60px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid #e2e8f0;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid #1d4ed8;
        border-radius: 50%;
        animation: spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
        margin-bottom: 24px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      h1 {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 10px 0;
        color: #1d4ed8;
      }
      p {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h1>مرسم — نظام إدارة المرسم</h1>
      <p>جاري تشغيل الخادم والاتصال بقاعدة البيانات...</p>
    </div>
  </body>
  </html>
`;

async function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'public', 'icon.ico')
    : path.join(__dirname, '..', 'public', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'مرسم — نظام إدارة المرسم ودورات الفنون',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.maximize();

  // Show splash immediately
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));

  // Smart polling loader: waits for the server to be completely healthy before loading
  let serverReady = false;
  let attempts = 0;
  const maxAttempts = 35;

  while (!serverReady && attempts < maxAttempts) {
    serverReady = await pingServer(APP_URL);
    if (!serverReady) {
      await new Promise((r) => setTimeout(r, 800));
      attempts++;
    }
  }

  if (serverReady) {
    logMessage('Server responded successfully, loading app URL...');
    mainWindow.loadURL(APP_URL).catch((err) => {
      logMessage(`Failed to load URL: ${err}`);
    });
  } else {
    logMessage('ERROR: Server did not respond after maximum attempts.');
  }

  // Open external links in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startStandaloneServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopServer();
});

app.on('will-quit', () => {
  stopServer();
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
