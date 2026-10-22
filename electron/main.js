/* eslint-disable @typescript-eslint/no-require-imports -- Electron's main entry is CommonJS. */
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
  } catch {}
}

function pingServer(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(res.statusCode === 200 && payload.service === 'marsam' && payload.status === 'ok');
        } catch {
          resolve(false);
        }
      });
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
  if (serverProcess && serverProcess.exitCode === null) {
    logMessage('Standalone server process is already running; waiting for its health endpoint.');
    return;
  }

  const healthUrl = `${APP_URL}/api/health`;
  const isAlive = await pingServer(healthUrl);
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
    MARSAM_DESKTOP: '1',
    ELECTRON_RUN_AS_NODE: '1'
  });

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: env,
    stdio: 'pipe',
    windowsHide: true
  });

  const spawnedServer = serverProcess;

  spawnedServer.on('error', (error) => {
    logMessage(`ERROR: Could not start standalone server: ${error.stack || error.message}`);
  });

  if (spawnedServer.stdout) {
    spawnedServer.stdout.on('data', (d) => logMessage(`[Next.js Server] ${d.toString().trim()}`));
  }
  if (spawnedServer.stderr) {
    spawnedServer.stderr.on('data', (d) => logMessage(`[Next.js Error] ${d.toString().trim()}`));
  }

  spawnedServer.on('exit', (code, signal) => {
    logMessage(`Server process exited with code ${code}, signal ${signal}`);
    if (serverProcess === spawnedServer) serverProcess = null;
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
    } catch {}
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

const startupErrorHtml = `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <title>تعذر تشغيل مرسم</title>
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      .card { max-width: 520px; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; background: white; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,.05); }
      h1 { color: #1d4ed8; font-size: 22px; }
      p { color: #64748b; line-height: 1.8; }
      a { display: inline-block; margin-top: 12px; padding: 11px 22px; border-radius: 10px; background: #1d4ed8; color: white; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>تعذر تشغيل مرسم</h1>
      <p>لم يستجب الخادم المحلي بعد. أعد المحاولة، وإذا تكرر الخطأ أرسل سجل التشغيل للدعم.</p>
      <a href="marsam://retry">إعادة المحاولة</a>
    </main>
  </body>
  </html>
`;

let startupAttemptInProgress = false;

async function waitForServerReady(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${APP_URL}/api/health`;

  while (mainWindow && Date.now() < deadline) {
    if (await pingServer(healthUrl, 2500)) return true;
    if (!serverProcess && Date.now() + 1000 < deadline) {
      await startStandaloneServer();
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return false;
}

async function connectToApp() {
  if (!mainWindow || startupAttemptInProgress) return;
  startupAttemptInProgress = true;

  try {
    await startStandaloneServer();
    const serverReady = await waitForServerReady();

    if (serverReady && mainWindow) {
      logMessage('Health endpoint responded successfully, loading app URL...');
      await mainWindow.loadURL(APP_URL);
    } else if (mainWindow) {
      logMessage('ERROR: Health endpoint did not respond within 60 seconds.');
      await mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(startupErrorHtml));
    }
  } catch (error) {
    logMessage(`ERROR: Desktop startup failed: ${error.stack || error.message}`);
    if (mainWindow) {
      await mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(startupErrorHtml));
    }
  } finally {
    startupAttemptInProgress = false;
  }
}

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

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === 'marsam://retry') {
      event.preventDefault();
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
      void connectToApp();
    }
  });

  // Open external links in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  void connectToApp();
}

app.whenReady().then(async () => {
  if (!gotTheLock) return;

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
