const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const CHECK_INTERVAL_MS = 5 * 1000;

let timer = null;
let currentSettings = null;
let onDue = null;
let isAwayFn = null;
let accumulatedMs = 0;
let lastTickTime = null;

function isTodayEnabled(settings, now) {
  const dayKey = DAY_KEYS[now.getDay()];
  return !!settings.days[dayKey];
}

function isWithinTimeWindow(settings, now) {
  if (!settings.startTime || !settings.endTime) return true;
  const [startH, startM] = settings.startTime.split(':').map(Number);
  const [endH, endM] = settings.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function tick() {
  const now = Date.now();
  const delta = lastTickTime === null ? 0 : now - lastTickTime;
  lastTickTime = now;

  if (!currentSettings) return;

  const nowDate = new Date(now);
  if (
    !currentSettings.enabled
    || !isTodayEnabled(currentSettings, nowDate)
    || !isWithinTimeWindow(currentSettings, nowDate)
  ) {
    accumulatedMs = 0;
    return;
  }

  const away = isAwayFn ? isAwayFn() : false;
  if (away) {
    accumulatedMs = 0;
    return;
  }

  accumulatedMs += delta;
  const intervalMs = currentSettings.intervalMinutes * 60 * 1000;
  if (intervalMs > 0 && accumulatedMs >= intervalMs) {
    accumulatedMs = 0;
    if (onDue) onDue(currentSettings);
  }
}

function start(settings, onDueCallback, isAwayCallback) {
  currentSettings = settings;
  onDue = onDueCallback;
  isAwayFn = isAwayCallback;
  if (timer) return;
  lastTickTime = Date.now();
  timer = setInterval(tick, CHECK_INTERVAL_MS);
}

function updateSettings(settings) {
  currentSettings = settings;
}

function restart() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  lastTickTime = Date.now();
  timer = setInterval(tick, CHECK_INTERVAL_MS);
}

function getRemainingMs() {
  if (!currentSettings || !currentSettings.enabled) return null;
  const intervalMs = currentSettings.intervalMinutes * 60 * 1000;
  if (intervalMs <= 0) return null;
  return Math.max(0, intervalMs - accumulatedMs);
}

module.exports = { start, updateSettings, getRemainingMs, restart };
