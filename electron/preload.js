const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadScores: () => ipcRenderer.invoke('load-scores'),
  saveScore: (score) => ipcRenderer.invoke('save-score', score),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadProgress: () => ipcRenderer.invoke('load-progress'),
  saveProgress: (progress) => ipcRenderer.invoke('save-progress', progress),
});
