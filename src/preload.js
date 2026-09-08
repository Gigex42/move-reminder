const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminderApi', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  testNotification: () => ipcRenderer.invoke('settings:testNotification'),
  getAutostart: () => ipcRenderer.invoke('autostart:get'),
  setAutostart: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
});
