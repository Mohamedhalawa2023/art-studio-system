const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: 'مرسم — نظام إدارة المرسم ودورات الفنون',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const appUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  // Smart retry loader: waits for the Next.js server to start without crashing
  const loadApp = () => {
    win.loadURL(appUrl).catch((err) => {
      console.log('جاري انتظار تشغيل السيرفر على ' + appUrl + ' ...');
      setTimeout(loadApp, 1500);
    });
  };

  loadApp();

  // Open external links safely
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
