const DAY_LABELS = {
  mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag',
  fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag',
};

const enabledInput = document.getElementById('enabled');
const autostartInput = document.getElementById('autostart');
const skipWhenIdleInput = document.getElementById('skipWhenIdle');
const soundSelect = document.getElementById('sound');
const playSoundButton = document.getElementById('playSound');
const soundPickerRow = document.getElementById('soundPickerRow');
const soundToggleRow = document.getElementById('soundToggleRow');
const soundToggleInput = document.getElementById('soundToggle');
const overlayDurationRow = document.getElementById('overlayDurationRow');
const overlayDurationSelect = document.getElementById('overlayDuration');

let lastSoundChoice = 'chime';
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const intervalSelect = document.getElementById('interval');
const displayModeSelect = document.getElementById('displayMode');
const dayToggles = Array.from(document.querySelectorAll('.day-toggle'));
const nextInfo = document.getElementById('nextInfo');
const status = document.getElementById('status');
const saveButton = document.getElementById('save');
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const tabPanels = {
  general: document.getElementById('tab-general'),
  messages: document.getElementById('tab-messages'),
};
const messagesList = document.getElementById('messagesList');
const addMessageButton = document.getElementById('addMessage');

let currentDays = {};

const SOUND_PATTERNS = {
  chime: [{ freq: 880, start: 0, dur: 0.25 }, { freq: 1175, start: 0.18, dur: 0.35 }],
  ping: [{ freq: 1200, start: 0, dur: 0.15 }],
  bell: [{ freq: 660, start: 0, dur: 0.6 }],
  rising: [{ freq: 523, start: 0, dur: 0.12 }, { freq: 659, start: 0.1, dur: 0.12 }, { freq: 784, start: 0.2, dur: 0.3 }],
};

function playSound(name) {
  const pattern = SOUND_PATTERNS[name];
  if (!pattern) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    pattern.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch (e) {
    // ignore
  }
}

playSoundButton.addEventListener('click', () => playSound(soundSelect.value));

function updateSoundRowVisibility() {
  const isFullscreen = displayModeSelect.value === 'fullscreen';
  soundPickerRow.hidden = !isFullscreen;
  soundToggleRow.hidden = isFullscreen;
  overlayDurationRow.hidden = !isFullscreen;
}

soundSelect.addEventListener('change', () => {
  if (soundSelect.value !== 'none') lastSoundChoice = soundSelect.value;
});

soundToggleInput.addEventListener('change', () => {
  soundSelect.value = soundToggleInput.checked ? lastSoundChoice : 'none';
});

displayModeSelect.addEventListener('change', updateSoundRowVisibility);

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
    Object.entries(tabPanels).forEach(([name, panel]) => {
      panel.hidden = name !== btn.dataset.tab;
    });
  });
});

function addMessageRow(text = '') {
  const row = document.createElement('div');
  row.className = 'message-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'message-input';
  input.value = text;
  input.placeholder = 'Neue Nachricht...';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-message';
  removeBtn.textContent = '✕';
  removeBtn.title = 'Entfernen';
  removeBtn.addEventListener('click', () => row.remove());

  row.appendChild(input);
  row.appendChild(removeBtn);
  messagesList.appendChild(row);
  return input;
}

addMessageButton.addEventListener('click', () => {
  const input = addMessageRow('');
  input.focus();
});

function applySettingsToForm(settings) {
  enabledInput.checked = settings.enabled;
  intervalSelect.value = String(settings.intervalMinutes);
  displayModeSelect.value = settings.displayMode || 'notification';
  skipWhenIdleInput.checked = settings.skipWhenIdle !== false;
  soundSelect.value = settings.sound || 'chime';
  if (settings.sound && settings.sound !== 'none') lastSoundChoice = settings.sound;
  soundToggleInput.checked = (settings.sound || 'chime') !== 'none';
  overlayDurationSelect.value = String(settings.overlayDuration ?? 30);
  updateSoundRowVisibility();
  startTimeInput.value = settings.startTime || '09:00';
  endTimeInput.value = settings.endTime || '17:00';
  currentDays = { ...settings.days };
  dayToggles.forEach((el) => {
    const day = el.dataset.day;
    el.classList.toggle('active', !!currentDays[day]);
  });

  messagesList.innerHTML = '';
  const messages = Array.isArray(settings.messages) ? settings.messages : [];
  messages.forEach((msg) => addMessageRow(msg));
}

function formatIntervalLabel(minutes) {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} Sekunde${seconds === 1 ? '' : 'n'}`;
  }
  return `${minutes} Minute${minutes === 1 ? '' : 'n'}`;
}

function renderScheduleInfo() {
  if (!enabledInput.checked) {
    nextInfo.textContent = 'Reminder ist deaktiviert.';
    return;
  }
  const minutes = Number(intervalSelect.value);
  let text = `Reminder kommt, nachdem du ${formatIntervalLabel(minutes)} am Stück aktiv warst, zwischen ${startTimeInput.value} und ${endTimeInput.value} Uhr.`;
  if (skipWhenIdleInput.checked) {
    text += ' Der Countdown startet neu, wenn du länger abwesend warst.';
  }
  nextInfo.textContent = text;
}

function readMessagesFromForm() {
  return Array.from(messagesList.querySelectorAll('.message-input'))
    .map((input) => input.value.trim())
    .filter((text) => text.length > 0);
}

function readFormAsSettings() {
  return {
    enabled: enabledInput.checked,
    intervalMinutes: Number(intervalSelect.value),
    displayMode: displayModeSelect.value,
    skipWhenIdle: skipWhenIdleInput.checked,
    sound: soundSelect.value,
    overlayDuration: Number(overlayDurationSelect.value),
    startTime: startTimeInput.value || '09:00',
    endTime: endTimeInput.value || '17:00',
    days: { ...currentDays },
    messages: readMessagesFromForm(),
  };
}

dayToggles.forEach((el) => {
  el.addEventListener('click', () => {
    const day = el.dataset.day;
    currentDays[day] = !currentDays[day];
    el.classList.toggle('active', currentDays[day]);
  });
});

saveButton.addEventListener('click', async () => {
  const settings = readFormAsSettings();
  await window.reminderApi.saveSettings(settings);
  renderScheduleInfo();
  status.textContent = 'Gespeichert.';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

[enabledInput, intervalSelect, skipWhenIdleInput, startTimeInput, endTimeInput].forEach((el) => {
  el.addEventListener('change', renderScheduleInfo);
});

autostartInput.addEventListener('change', async () => {
  await window.reminderApi.setAutostart(autostartInput.checked);
});

(async () => {
  const { settings } = await window.reminderApi.getSettings();
  applySettingsToForm(settings);
  renderScheduleInfo();
  autostartInput.checked = await window.reminderApi.getAutostart();
})();
