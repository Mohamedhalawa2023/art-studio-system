const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const HOST = '127.0.0.1';
const APP_URL = `http://${HOST}:${PORT}`;

// Check if server is answering requests
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

// Locate standalone server directory
function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'standalone');
  }
  return path.join(__dirname, '..', '.next', 'standalone');
}

// Start standalone Next.js server if not already running
async function startStandaloneServer() {
  const isAlive = await pingServer(APP_URL);
  if (isAlive) {
    console.log('[Marsam Desktop] Server is already running on', APP_URL);
    return;
  }

  const standaloneDir = getStandaloneDir();
  const serverScript = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverScript)) {
    console.warn('[Marsam Desktop] Standalone server script not found at:', serverScript);
    return;
  }

  console.log('[Marsam Desktop] Spawning standalone Next.js server:', serverScript);

  // In packaged Electron, process.execPath is the app binary.
  // Setting ELECTRON_RUN_AS_NODE: '1' runs Electron internal Node engine directly.
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
    serverProcess.stdout.on('data', (d) => console.log(`[Next.js Server] ${d.toString().trim()}`));
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => console.error(`[Next.js Error] ${d.toString().trim()}`));
  }

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Marsam Desktop] Server process exited with code ${code}, signal ${signal}`);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('[Marsam Desktop] Terminating embedded server...');
    try {
      serverProcess.kill('SIGTERM');
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      }
    } catch (e) {
      // ignore
    }
    serverProcess = null;
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
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.maximize();

  // Smart polling loader: waits for the server to be completely healthy before loading
  let serverReady = false;
  let attempts = 0;
  const maxAttempts = 40;

  while (!serverReady && attempts < maxAttempts) {
    serverReady = await pingServer(APP_URL);
    if (!serverReady) {
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }
  }

  mainWindow.loadURL(APP_URL).catch((err) => {
    console.error('[Marsam Desktop] Failed to load URL:', err);
  });

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
