const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  close: () => ipcRenderer.send('overlay:close'),
});
