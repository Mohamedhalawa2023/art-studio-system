const { app, BrowserWindow, safeStorage } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, spawnSync } = require('child_process');
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
const HOST = '127.0.0.1';
let PORT = 3000;
let APP_URL = `http://${HOST}:${PORT}`;
let serverStartupError = null;

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

function requestServer(url, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body });
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function pingServer(url, timeoutMs = 1200) {
  const response = await requestServer(url, timeoutMs);
  if (!response) return false;

  try {
    const payload = JSON.parse(response.body);
    if (response.statusCode === 200 && payload.service === 'marsam' && payload.status === 'ok') return true;
  } catch {}

  return false;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, HOST, () => probe.close(() => resolve(true)));
  });
}

async function selectAppPort() {
  for (let port = 3000; port <= 3010; port += 1) {
    const candidateUrl = `http://${HOST}:${port}`;
    const existingMarsamServer = await pingServer(`${candidateUrl}/api/health`);
    if (existingMarsamServer && !app.isPackaged) {
      PORT = port;
      APP_URL = candidateUrl;
      logMessage(`Reusing an existing Marsam server on ${APP_URL}`);
      return false;
    }
    if (existingMarsamServer) {
      logMessage(`Found an existing Marsam server on ${candidateUrl}; the packaged app will use its bundled server to keep assets matched.`);
    }
    if (await isPortAvailable(port)) {
      PORT = port;
      APP_URL = candidateUrl;
      logMessage(`Selected free local port ${PORT}`);
      return true;
    }
    logMessage(`Port ${port} is occupied by another service; leaving it untouched.`);
  }

  throw new Error('No free local port was found between 3000 and 3010. Close an application using these ports, then retry.');
}

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'standalone');
  }
  const outputDirs = [...new Set([process.env.MARSAM_NEXT_DIST_DIR, '.next-release-build', '.next'].filter(Boolean))];
  const existingBuild = outputDirs
    .map(outputDir => path.join(__dirname, '..', outputDir, 'standalone'))
    .find(standaloneDir => fs.existsSync(path.join(standaloneDir, 'server.js')));
  return existingBuild || path.join(__dirname, '..', outputDirs[0], 'standalone');
}

function getDatabaseEncryptionKey() {
  if (process.platform !== 'win32') return null;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('تعذر تفعيل تشفير Windows لبيانات مرسم. أعد تشغيل Windows ثم حاول مرة أخرى.');
  }

  const storageDir = path.join(app.getPath('appData'), 'MarsamArtStudio');
  const keyPath = path.join(storageDir, 'database-key.dpapi');
  fs.mkdirSync(storageDir, { recursive: true });

  if (fs.existsSync(keyPath)) {
    try {
      const key = safeStorage.decryptString(fs.readFileSync(keyPath)).trim();
      if (/^[a-f0-9]{64}$/i.test(key)) return key;
    } catch (error) {
      logMessage(`ERROR: Could not decrypt local database key: ${error.message}`);
    }
    throw new Error('تعذر قراءة مفتاح حماية البيانات على حساب Windows الحالي. لا تحذف مجلد بيانات مرسم؛ تواصل مع الدعم.');
  }

  const key = require('crypto').randomBytes(32).toString('hex');
  const temporaryPath = `${keyPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, safeStorage.encryptString(key), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporaryPath, keyPath);
  } catch (error) {
    try { fs.unlinkSync(temporaryPath); } catch {}
    // A second app instance can win the first-run race; use its persisted key.
    if (fs.existsSync(keyPath)) return safeStorage.decryptString(fs.readFileSync(keyPath)).trim();
    throw new Error(`تعذر إنشاء مفتاح حماية بيانات مرسم: ${error.message}`);
  }
  return key;
}

async function startStandaloneServer() {
  if (serverProcess && serverProcess.exitCode === null) {
    logMessage('Standalone server process is already running; waiting for its health endpoint.');
    return;
  }

  serverStartupError = null;
  if (!await selectAppPort()) return;

  const standaloneDir = getStandaloneDir();
  const serverScript = path.join(standaloneDir, 'server.js');

  logMessage(`Standalone directory: ${standaloneDir}`);
  logMessage(`Server script: ${serverScript}`);

  if (!fs.existsSync(serverScript)) {
    throw new Error(`Standalone server.js was not found at ${serverScript}`);
  }

  const nextModule = path.join(standaloneDir, 'node_modules', 'next');
  logMessage(`Next.js module path: ${nextModule} (Exists: ${fs.existsSync(nextModule)})`);

  const databaseEncryptionKey = getDatabaseEncryptionKey();

  logMessage(`Spawning standalone server process via ${process.execPath}...`);

  const env = Object.assign({}, process.env, {
    PORT: String(PORT),
    HOSTNAME: HOST,
    NODE_ENV: 'production',
    MARSAM_DESKTOP: '1',
    ...(databaseEncryptionKey ? { MARSAM_DB_ENCRYPTION_KEY: databaseEncryptionKey } : {}),
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
    serverStartupError = error.message;
    logMessage(`ERROR: Could not start standalone server: ${error.stack || error.message}`);
  });

  if (spawnedServer.stdout) {
    spawnedServer.stdout.on('data', (d) => logMessage(`[Next.js Server] ${d.toString().trim()}`));
  }
  if (spawnedServer.stderr) {
    spawnedServer.stderr.on('data', (d) => logMessage(`[Next.js Error] ${d.toString().trim()}`));
  }

  spawnedServer.on('exit', (code, signal) => {
    serverStartupError = `Server exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}.`;
    logMessage(`Server process exited with code ${code}, signal ${signal}`);
    if (serverProcess === spawnedServer) serverProcess = null;
  });
}

function stopServer() {
  const child = serverProcess;
  if (!child) return;

  serverProcess = null;
  logMessage(`Terminating embedded Next.js server${child.pid ? ` (PID ${child.pid})` : ''}...`);
  try {
    if (process.platform === 'win32' && child.pid) {
      // The packaged server is started with this same executable in Electron-as-Node mode.
      // Wait for taskkill to finish so NSIS cannot see a leftover Marsam.exe during upgrades.
      const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 8_000,
      });
      if (result.error || result.status !== 0) {
        logMessage(`WARNING: taskkill did not confirm server shutdown: ${result.error?.message || result.status}`);
        child.kill();
      }
    } else {
      child.kill('SIGTERM');
    }
  } catch (error) {
    logMessage(`WARNING: Could not terminate embedded server cleanly: ${String(error)}`);
    try { child.kill(); } catch {}
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
        background: #0E1629;
        color: #F8FAFC;
      }
      .card {
        background: #1B2537;
        padding: 40px 60px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid #2A3B56;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 4px solid #2A3B56;
        border-top: 4px solid #2DD4BF;
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
        color: #2DD4BF;
      }
      p {
        font-size: 14px;
        color: #94A3B8;
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
      body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: "Segoe UI", sans-serif; background: #0E1629; color: #F8FAFC; }
      .card { max-width: 520px; padding: 36px; border: 1px solid #2A3B56; border-radius: 16px; background: #1B2537; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,.3); }
      h1 { color: #2DD4BF; font-size: 22px; }
      p { color: #94A3B8; line-height: 1.8; }
      a { display: inline-block; margin-top: 12px; padding: 11px 22px; border-radius: 10px; background: #0D9488; color: white; text-decoration: none; font-weight: 700; }
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

const startupErrorMessage = 'لم يستجب الخادم المحلي بعد. أعد المحاولة، وإذا تكرر الخطأ أرسل سجل التشغيل للدعم.';

function renderStartupError(details = startupErrorMessage) {
  const safeDetails = String(details).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  return startupErrorHtml.replace(startupErrorMessage, safeDetails);
}

let startupAttemptInProgress = false;

async function waitForServerReady(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${APP_URL}/api/health`;

  while (mainWindow && Date.now() < deadline) {
    if (await pingServer(healthUrl, 2500)) return true;
    if (serverStartupError) throw new Error(serverStartupError);
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
      logMessage('ERROR: Health endpoint did not respond within 45 seconds.');
      await mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(renderStartupError('لم يستجب الخادم المحلي خلال 45 ثانية. أعد المحاولة، وإذا تكرر الخطأ أرسل سجل التشغيل للدعم.')));
    }
  } catch (error) {
    logMessage(`ERROR: Desktop startup failed: ${error.stack || error.message}`);
    if (mainWindow) {
      await mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(renderStartupError(error.message)));
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
