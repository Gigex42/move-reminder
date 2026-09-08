const path = require('path');
const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, Notification, screen, powerMonitor, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { loadSettings, saveSettings } = require('./store');
const scheduler = require('./scheduler');

let tray = null;
let settingsWindow = null;
let overlayWindows = [];

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Bewegungs-Reminder');

  tray.on('click', () => {
    toggleSettingsWindow();
  });

  tray.on('right-click', () => {
    const meetingItem = isManuallyPaused()
      ? { label: 'Meeting-Modus beenden', click: () => clearManualPause() }
      : {
          label: 'Meeting-Modus (Reminder pausieren)',
          submenu: [
            { label: 'Für 30 Minuten', click: () => setManualPause(30) },
            { label: 'Für 60 Minuten', click: () => setManualPause(60) },
            { label: 'Bis ich es wieder beende', click: () => setManualPause('indefinite') },
          ],
        };

    const menu = Menu.buildFromTemplate([
      { label: 'Einstellungen öffnen', click: () => openSettingsWindow() },
      { type: 'separator' },
      meetingItem,
      { type: 'separator' },
      { label: 'Nach Updates suchen', click: () => checkForUpdatesManually() },
      { type: 'separator' },
      { label: 'Beenden', click: () => app.quit() },
    ]);
    tray.popUpContextMenu(menu);
  });
}

function toggleSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  } else {
    openSettingsWindow();
  }
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 440,
    height: 780,
    resizable: false,
    title: 'Bewegungs-Reminder – Einstellungen',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function closeOverlays() {
  overlayWindows.forEach((win) => {
    if (!win.isDestroyed()) win.close();
  });
  overlayWindows = [];
}

function pickRandomMessage(settings) {
  const messages = Array.isArray(settings.messages) && settings.messages.length > 0
    ? settings.messages
    : ['Zeit, dich zu bewegen!'];
  return messages[Math.floor(Math.random() * messages.length)];
}

function showFullscreenOverlay(settings, message) {
  closeOverlays();

  overlayWindows = screen.getAllDisplays().map((display) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#0a0c10',
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.loadFile(path.join(__dirname, 'overlay.html'), {
      query: {
        message,
        sound: settings.sound || 'none',
        duration: String(settings.overlayDuration ?? 30),
      },
    });

    win.on('closed', () => {
      overlayWindows = overlayWindows.filter((w) => w !== win);
    });

    return win;
  });
}

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

function checkForUpdatesManually() {
  if (!app.isPackaged) {
    dialog.showMessageBox({
      title: 'Update-Prüfung',
      message: 'Update-Prüfung ist nur in der gepackten App verfügbar (nicht im Entwicklungsmodus).',
    });
    return;
  }

  autoUpdater.checkForUpdates().catch((err) => {
    dialog.showMessageBox({
      type: 'error',
      title: 'Update-Prüfung fehlgeschlagen',
      message: err.message,
    });
  });
}

function setupAutoUpdater() {
  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err);
  });

  if (!app.isPackaged) return;

  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), UPDATE_CHECK_INTERVAL_MS);
}

const IDLE_THRESHOLD_SECONDS = 180;
const RESUME_GRACE_PERIOD_MS = 60 * 1000;

let resumedAt = null;
let manualPauseUntil = null; // null = not paused, 'indefinite', or a timestamp in ms

function setManualPause(duration) {
  manualPauseUntil = duration === 'indefinite' ? 'indefinite' : Date.now() + duration * 60 * 1000;
  updateTrayTooltip();
}

function clearManualPause() {
  manualPauseUntil = null;
  updateTrayTooltip();
}

function isManuallyPaused() {
  if (manualPauseUntil === 'indefinite') return true;
  if (manualPauseUntil && Date.now() < manualPauseUntil) return true;
  if (manualPauseUntil) manualPauseUntil = null;
  return false;
}

function updateTrayTooltip() {
  if (!tray) return;
  if (manualPauseUntil === 'indefinite') {
    tray.setToolTip('Bewegungs-Reminder (pausiert)');
  } else if (manualPauseUntil) {
    const time = new Date(manualPauseUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    tray.setToolTip(`Bewegungs-Reminder (pausiert bis ${time})`);
  } else {
    tray.setToolTip('Bewegungs-Reminder');
  }
}

function isUserAway() {
  const settings = loadSettings();

  if (overlayWindows.length > 0) {
    return true;
  }

  if (isManuallyPaused()) {
    return true;
  }

  if (settings.skipWhenIdle) {
    if (resumedAt && Date.now() - resumedAt < RESUME_GRACE_PERIOD_MS) {
      return true;
    }
    const idleState = powerMonitor.getSystemIdleState(IDLE_THRESHOLD_SECONDS);
    if (idleState === 'idle' || idleState === 'locked') {
      return true;
    }
  }

  return false;
}

function showReminder(settings) {
  const message = pickRandomMessage(settings);
  if (settings.displayMode === 'fullscreen') {
    showFullscreenOverlay(settings, message);
  } else {
    new Notification({
      title: 'Zeit, dich zu bewegen!',
      body: message,
      icon: path.join(__dirname, '..', 'build-resources', 'icon-1024.png'),
      silent: !settings.sound || settings.sound === 'none',
    }).show();
  }
}

function registerIpcHandlers() {
  ipcMain.on('overlay:close', () => closeOverlays());

  ipcMain.handle('settings:get', () => {
    const settings = loadSettings();
    return { settings };
  });

  ipcMain.handle('settings:save', (_event, newSettings) => {
    saveSettings(newSettings);
    scheduler.updateSettings(newSettings);
    return { settings: newSettings };
  });

  ipcMain.handle('settings:testNotification', () => {
    const settings = loadSettings();
    showReminder(settings);
  });

  ipcMain.handle('autostart:get', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('autostart:set', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  setupAutoUpdater();

  powerMonitor.on('resume', () => {
    resumedAt = Date.now();
    scheduler.restart();
  });
  powerMonitor.on('unlock-screen', () => {
    resumedAt = Date.now();
  });

  const settings = loadSettings();
  registerIpcHandlers();
  createTray();
  scheduler.start(settings, showReminder, isUserAway);
  openSettingsWindow();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
