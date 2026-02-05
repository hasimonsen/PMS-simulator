const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function getDataPath(filename) {
  const dir = isDev
    ? path.join(__dirname, '..', 'data')
    : path.join(app.getPath('userData'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

function readJSON(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read', filepath, e);
  }
  return fallback;
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'PMS Simulator',
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.setMenuBarVisibility(false);
}

// IPC handlers for file operations
ipcMain.handle('load-scores', async () => {
  const filepath = getDataPath('scores.json');
  return readJSON(filepath, []);
});

ipcMain.handle('save-score', async (_event, score) => {
  const filepath = getDataPath('scores.json');
  const scores = readJSON(filepath, []);
  scores.push(score);
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const trimmed = scores.slice(0, 100);
  writeJSON(filepath, trimmed);
  return trimmed;
});

ipcMain.handle('load-settings', async () => {
  const filepath = getDataPath('settings.json');
  return readJSON(filepath, null);
});

ipcMain.handle('save-settings', async (_event, settings) => {
  const filepath = getDataPath('settings.json');
  writeJSON(filepath, settings);
  return true;
});

ipcMain.handle('load-progress', async () => {
  const filepath = getDataPath('progress.json');
  return readJSON(filepath, { unlockedLevels: [1] });
});

ipcMain.handle('save-progress', async (_event, progress) => {
  const filepath = getDataPath('progress.json');
  writeJSON(filepath, progress);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
